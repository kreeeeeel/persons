package com.persons.person.service

import com.persons.person.component.ProfileRestrictions
import com.persons.person.contract.dto.AdminContentStatus
import com.persons.person.contract.dto.AdminPerson
import com.persons.person.contract.dto.AdminPersonPage
import com.persons.person.contract.dto.PersonDates
import com.persons.person.contract.dto.PersonPresence
import com.persons.person.contract.dto.PersonProfile
import com.persons.person.contract.dto.PersonSearchPage
import com.persons.person.contract.dto.PersonSummary
import com.persons.person.contract.dto.Reputation
import com.persons.person.contract.dto.SocialLink
import com.persons.person.contract.dto.SocialNetwork
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.dao.repository.SearchKeywordRepository
import com.persons.person.dao.repository.SocialLinkRepository
import com.persons.person.dao.repository.TagRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.AuthorProfile
import com.persons.person.exception.impl.InvalidInputException
import com.persons.person.transformer.toSummary
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import java.util.stream.Collectors

private const val TAG = "tag"
private const val MIN_QUERY_LENGTH = 2
private const val LEGACY_SOCIAL_URL_PREFIX = "https://"

@Service
@Transactional(readOnly = true)
class PersonQueryService(
    private val persons: PersonRepository,
    private val tags: TagRepository,
    private val keywords: SearchKeywordRepository,
    private val links: SocialLinkRepository,
    private val moderation: ModerationRepository,
    private val access: PersonAccessService,
    private val reactions: ReactionService,
    private val stats: StatsService,
    private val authors: AuthorProfileService,
    private val publicAuthors: PublicAuthorService,
    private val restrictions: ProfileRestrictions,
) {
    fun recommendations(actor: Actor?, size: Int): List<PersonSummary> = persons.recommendations(actor?.id, size)
        .stream().map { it.toSummary() }.toList()

    fun search(query: String, page: Int, size: Int): PersonSearchPage {
        if (query.trim().length < MIN_QUERY_LENGTH) {
            throw InvalidInputException()
        }

        val result = persons.search(query, PageRequest.of(page, size, Sort.by(TAG)), false)

        return PersonSearchPage(
            result.content.stream().map {
                PersonSummary(it.id, it.tag, name(it), it.avatarMediaId)
            }.toList(),
            result.totalElements, page, size,
        )
    }

    fun profile(tag: String, actor: Actor?): PersonProfile {
        val row = access.byTag(tag, actor)
        val rating = reactions.state(row.id, actor)

        return PersonProfile(
            id = row.id,
            tag = row.tag,
            fullName = name(row),
            firstName = row.firstName,
            lastName = row.lastName,
            patronymic = row.patronymic,
            description = row.description,
            presence = PersonPresence(row.presenceStatus?.let { PersonPresence.Status.valueOf(it) }, row.presenceSince),
            linkedAccount = row.ownerAccountId?.let { publicAuthors.byId(it, name(row)) },
            restriction = restrictions.current(row.ownerAccountId),
            dates = PersonDates(row.birthDate, row.militaryDepartureDate, row.militaryReturnDate),
            tags = tags.byPerson(row.id).stream().map { it.label }.toList(),
            searchKeywords = keywords.byPerson(row.id).stream().map { it.keyword }.toList(),
            socialLinks = links.byPerson(row.id).stream().map {
                val network = SocialNetwork.valueOf(it.network.name)
                if (network == SocialNetwork.DISCORD && !it.value.startsWith(LEGACY_SOCIAL_URL_PREFIX)) {
                    SocialLink(network, tag = it.value)
                } else {
                    SocialLink(network, url = it.value)
                }
            }.toList(),
            ratingOptions = rating.options,
            stats = stats.get(row.id, row.reputationOverride?.let { Reputation.valueOf(it.name) }),
            reputationOverride = row.reputationOverride?.let { Reputation.valueOf(it.name) },
            avatarMediaId = row.avatarMediaId,
            canEdit = access.canEdit(row, actor),
            version = row.version ?: 0,
            verified = row.verified,
            canClaim = row.ownerAccountId == null && (actor == null || persons.byOwner(actor.id) == null),
            claimPending = actor != null && moderation.pendingClaim(row.id, actor.id),
            rating = rating,
        )
    }

    fun admin(query: String, page: Int, size: Int): AdminPersonPage {
        val result = persons.search(query, PageRequest.of(page, size, Sort.by(TAG)), true)
        val pending = moderation.pendingCounts(result.content.stream().map { it.id }.toList())

        val owners = owners(result.content)
        return AdminPersonPage(
            result.content.stream().map { adminDto(it, pending[it.id] ?: 0, owners[it.ownerAccountId]) }.toList(),
            result.totalElements, page, size,
        )
    }

    fun adminPerson(id: UUID, actor: Actor): AdminPerson {
        val person = access.visible(id, actor)
        val pending = moderation.pendingCounts(listOf(id))[id] ?: 0
        return adminDto(person, pending, owners(listOf(person))[person.ownerAccountId])
    }

    private fun owners(rows: List<PersonEntity>): Map<UUID, AuthorProfile> = authors.profiles(
        rows.stream().filter { it.ownerAccountId != null }.collect(
            Collectors.toMap({ it.ownerAccountId as UUID }, { name(it) }, { first, _ -> first }),
        ),
    )

    private fun adminDto(person: PersonEntity, pending: Long, owner: AuthorProfile?): AdminPerson = AdminPerson(
        person.id, person.tag, name(person), person.published, pending, person.ownerAccountId,
        avatarMediaId = person.avatarMediaId, ownerName = owner?.authorName,
        ownerTag = if (person.ownerAccountId ==
            null
        ) {
            null
        } else {
            owner?.authorTag ?: person.tag
        },
        ownerAvatarUrl = owner?.authorAvatarUrl,
        status = when {
            person.deleted -> AdminContentStatus.HIDDEN
            person.published -> AdminContentStatus.PUBLISHED
            pending > 0 -> AdminContentStatus.PENDING
            else -> AdminContentStatus.DRAFT
        },
    )

    private fun name(person: PersonEntity): String =
        listOf(person.lastName, person.firstName, person.patronymic.orEmpty())
            .stream().filter { it.isNotBlank() }.collect(Collectors.joining(" "))
}
