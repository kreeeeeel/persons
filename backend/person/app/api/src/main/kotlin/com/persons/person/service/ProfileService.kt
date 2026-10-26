package com.persons.person.service

import com.persons.person.component.ProfileValidator
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.PersonDates
import com.persons.person.contract.dto.ProfileInput
import com.persons.person.contract.dto.RatingOptionInput
import com.persons.person.contract.dto.SocialLink
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.RatingOptionEntity
import com.persons.person.dao.entity.SearchKeywordEntity
import com.persons.person.dao.entity.SocialLinkEntity
import com.persons.person.dao.entity.TagEntity
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.dao.repository.RatingOptionRepository
import com.persons.person.dao.repository.RatingRepository
import com.persons.person.dao.repository.SearchKeywordRepository
import com.persons.person.dao.repository.SocialLinkRepository
import com.persons.person.dao.repository.TagRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.ErrorCode
import com.persons.person.domain.OwnerChange
import com.persons.person.domain.PageRestrictionScope
import com.persons.person.domain.SocialNetwork
import com.persons.person.exception.impl.ConflictException
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.InvalidInputException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger
import java.util.function.Function
import java.util.stream.Collectors
import com.persons.person.contract.dto.SocialNetwork as ApiSocialNetwork

private const val NEW_PROFILE = "Новая персона"
private const val UPDATE_PROFILE = "Изменение профиля"
private const val DELETE_PROFILE = "Удаление персоны"
private const val LINK_PROFILE = "Привязка аккаунта"

@Service
class ProfileService(
    private val persons: PersonRepository,
    private val tags: TagRepository,
    private val keywords: SearchKeywordRepository,
    private val socials: SocialLinkRepository,
    private val options: RatingOptionRepository,
    private val ratings: RatingRepository,
    private val access: PersonAccessService,
    private val queue: ModerationQueueService,
    private val validator: ProfileValidator,
    private val clock: Clock,
    private val pageRestrictions: PageRestrictionService,
) {
    @Transactional
    fun create(input: ProfileInput, actor: Actor): ModerationReceipt {
        val normalized = validator.normalize(input)
        ensureTag(normalized.tag)
        val person = persons.saveAndFlush(
            PersonEntity(
                tag = normalized.tag,
                firstName = normalized.firstName,
                lastName = normalized.lastName,
                ownerAccountId = if (actor.administrator) null else actor.id,
                createdAt = clock.instant(),
            ),
        )

        return queue.submit(person, person.id, ChangeKind.CREATE_PERSON, actor, NEW_PROFILE, normalized)
    }

    @Transactional
    fun propose(id: UUID, input: ProfileInput, actor: Actor): ModerationReceipt {
        val person = access.locked(id)
        pageRestrictions.ensure(id, actor, PageRestrictionScope.PROFILE)
        access.requireEditor(person, actor)
        val normalized = validator.normalize(input)
        ensureTag(normalized.tag, id)
        ensureVersion(person, normalized.version)

        return queue.submit(
            person, id, ChangeKind.UPDATE_PERSON, actor, UPDATE_PROFILE, normalized,
            previousPayload = snapshot(person),
        )
    }

    @Transactional
    fun remove(id: UUID, actor: Actor, reason: String? = null): ModerationReceipt {
        val person = access.locked(id)
        access.requireEditor(person, actor)

        return queue.submit(person, id, ChangeKind.DELETE_PERSON, actor, DELETE_PROFILE, reason = reason)
    }

    @Transactional
    fun link(id: UUID, owner: UUID?, actor: Actor): ModerationReceipt {
        if (!actor.administrator) {
            throw ForbiddenException()
        }

        val person = access.locked(id)

        return queue.submit(
            person, id, ChangeKind.LINK_ACCOUNT, actor, LINK_PROFILE, OwnerChange(owner),
            previousPayload = OwnerChange(person.ownerAccountId),
        )
    }

    fun apply(person: PersonEntity, input: ProfileInput, creating: Boolean) {
        val normalized = validator.normalize(input)
        ensureTag(normalized.tag, person.id)

        if (!creating) {
            ensureVersion(person, normalized.version)
        }

        val existingOptions = options.byPerson(person.id)
        val retained = normalized.ratingOptions.stream().map { it.emoji }.collect(Collectors.toSet())
        val counts = ratings.counts(person.id)

        if (existingOptions.stream().anyMatch { it.emoji !in retained && (counts[it.id] ?: 0) > 0 }) {
            throw ConflictException()
        }

        person.tag = normalized.tag
        person.firstName = normalized.firstName
        person.lastName = normalized.lastName
        person.patronymic = normalized.patronymic
        person.description = normalized.description
        normalized.dates?.let { dates ->
            person.birthDate = dates.birthDate
            person.militaryDepartureDate = dates.militaryDepartureDate
            person.militaryReturnDate = dates.militaryReturnDate
        }
        person.published = true
        if (creating && person.ownerAccountId != null) person.verified = true
        tags.byPerson(person.id).stream().forEach(tags::delete)
        socials.byPerson(person.id).stream().forEach(socials::delete)
        tags.flush()
        socials.flush()
        val tagPosition = AtomicInteger()
        normalized.tags.stream().forEach {
            tags.save(TagEntity(personId = person.id, label = it, position = tagPosition.getAndIncrement()))
        }
        normalized.searchKeywords?.let { values ->
            val existingKeywords = keywords.byPerson(person.id)
            if (existingKeywords.stream().map { it.keyword }.toList() != values) {
                existingKeywords.stream().forEach(keywords::delete)
                keywords.flush()
                val keywordPosition = AtomicInteger()
                values.stream().forEach {
                    keywords.save(
                        SearchKeywordEntity(
                            personId = person.id,
                            keyword = it,
                            position = keywordPosition.getAndIncrement(),
                        ),
                    )
                }
                if (!creating) {
                    persons.advanceVersion(person)
                }
            }
        }
        normalized.socialLinks.stream().forEach {
            val value = it.tag ?: it.url ?: throw InvalidInputException()
            socials.save(
                SocialLinkEntity(personId = person.id, network = SocialNetwork.valueOf(it.network.name), value = value),
            )
        }
        val existing = existingOptions.stream().collect(Collectors.toMap({ it.emoji }, Function.identity()))
        existing.values.stream().forEach { it.enabled = false }
        val optionPosition = AtomicInteger()
        normalized.ratingOptions.stream().forEach { inputOption ->
            val row = existing[inputOption.emoji] ?: RatingOptionEntity(personId = person.id, emoji = inputOption.emoji)
            row.label = inputOption.label
            row.enabled = true
            row.position = optionPosition.getAndIncrement()
            options.save(row)
        }
    }

    private fun snapshot(person: PersonEntity): ProfileInput = ProfileInput(
        tag = person.tag,
        firstName = person.firstName,
        lastName = person.lastName,
        patronymic = person.patronymic,
        description = person.description,
        dates = PersonDates(person.birthDate, person.militaryDepartureDate, person.militaryReturnDate),
        tags = tags.byPerson(person.id).stream().map { it.label }.toList(),
        searchKeywords = keywords.byPerson(person.id).stream().map { it.keyword }.toList(),
        socialLinks = socials.byPerson(person.id).stream().map {
            val network = ApiSocialNetwork.valueOf(it.network.name)
            if (it.network == SocialNetwork.DISCORD && !it.value.startsWith("https://")) {
                SocialLink(network, tag = it.value)
            } else {
                SocialLink(network, url = it.value)
            }
        }.toList(),
        ratingOptions = options.byPerson(person.id).stream().filter { it.enabled }
            .map { RatingOptionInput(it.emoji, it.label) }.toList(),
        version = person.version ?: 0,
    )

    private fun ensureTag(tag: String, id: UUID? = null) {
        val existing = persons.byTag(tag)

        if (existing != null && existing.id != id) {
            throw ConflictException(ErrorCode.SLUG_TAKEN)
        }
    }

    private fun ensureVersion(person: PersonEntity, version: Long) {
        if (person.version != version) {
            throw ConflictException()
        }
    }
}
