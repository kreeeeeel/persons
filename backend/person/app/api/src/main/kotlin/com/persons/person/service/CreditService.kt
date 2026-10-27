package com.persons.person.service

import com.persons.person.contract.dto.CreditEntry
import com.persons.person.contract.dto.CreditInput
import com.persons.person.contract.dto.CreditPage
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.dao.entity.CreditEntryEntity
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.repository.CreditEntryRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.ContentKind
import com.persons.person.domain.CreditKind
import com.persons.person.domain.ErrorCode
import com.persons.person.domain.FeedOrder
import com.persons.person.domain.PageRestrictionScope
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.InvalidInputException
import com.persons.person.exception.impl.NotFoundException
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.ZoneOffset
import java.util.UUID
import java.util.stream.Collectors
import com.persons.person.contract.dto.CreditKind as DomainCreditKind

private const val ADD_CREDIT = "История о займе"
private const val REMOVE_CREDIT = "Удаление истории о займе"
private const val EDIT_CREDIT = "Изменение истории о займе"
private const val DESCRIPTION = "description"

@Service
class CreditService(
    private val contentLikes: ContentLikeService,
    private val entries: CreditEntryRepository,
    private val access: PersonAccessService,
    private val queue: ModerationQueueService,
    private val clock: Clock,
    private val authors: AuthorProfileService,
    private val pending: PendingTextService,
    private val pageRestrictions: PageRestrictionService,
) {
    @Transactional(readOnly = true)
    fun page(
        personId: UUID,
        page: Int,
        size: Int,
        actor: Actor?,
        order: FeedOrder = FeedOrder.NEWEST,
        mine: Boolean = false,
    ): CreditPage {
        val person = access.visible(personId, actor)
        val rows = entries.page(
            personId,
            PageRequest.of(page, size),
            actor?.id,
            order,
            mine,
        )
        val votes = contentLikes.states(
            ContentKind.LOAN,
            rows.content.stream().map { it.id }.toList(),
            actor,
        )
        val profiles = authors.profiles(
            rows.content.stream().collect(
                Collectors.toMap({
                    it.authorId
                }, { it.authorName }, { left, _ -> left }),
            ),
        )
        val drafts = pending.texts(
            rows.content.stream().map {
                it.id
            }.toList(),
            ChangeKind.UPDATE_CREDIT, actor, DESCRIPTION,
        )

        return CreditPage(
            rows.content.stream().map {
                CreditEntry(
                    it.id, DomainCreditKind.valueOf(it.kind.name),
                    drafts[it.id] ?: it.description,
                    profiles.getValue(it.authorId).authorName, it.createdAt.atOffset(ZoneOffset.UTC),
                    it.published && (actor?.id == it.authorId || access.canEdit(person, actor)),
                    authorId = it.authorId, authorTag = profiles[it.authorId]?.authorTag,
                    authorAvatarMediaId = profiles[it.authorId]?.authorAvatarMediaId,
                    moderationStatus = if (!it.published ||
                        it.id in drafts
                    ) {
                        ModerationStatus.PENDING
                    } else {
                        ModerationStatus.APPROVED
                    },
                    likes = votes[it.id]?.count ?: 0, likedByMe = votes[it.id]?.liked ?: false,
                    dislikes = votes[it.id]?.dislikes ?: 0, dislikedByMe = votes[it.id]?.disliked ?: false,
                    authorAvatarUrl = profiles[it.authorId]?.authorAvatarUrl,
                )
            }.toList(),
            rows.totalElements, page, size,
        )
    }

    @Transactional
    fun propose(personId: UUID, input: CreditInput, actor: Actor): ModerationReceipt {
        access.locked(personId)
        val person = access.visible(personId, actor)
        pageRestrictions.ensure(personId, actor, PageRestrictionScope.LOANS)

        if (input.description.isBlank()) {
            throw InvalidInputException()
        }

        val id = UUID.randomUUID()
        entries.save(
            CreditEntryEntity(
                id = id, personId = personId, kind = CreditKind.valueOf(input.kind.name),
                description = input.description.trim(),
                authorId = actor.id,
                authorName = actor.name,
                createdAt = clock.instant(),
                published = false,

            ),
        )
        return queue.submit(
            person, id, ChangeKind.CREATE_CREDIT, actor, ADD_CREDIT,
            input.copy(description = input.description.trim()),
        )
    }

    @Transactional
    fun remove(id: UUID, actor: Actor, reason: String? = null): ModerationReceipt {
        val entry = live(id)
        val person = access.visible(entry.personId, actor)

        if (entry.authorId != actor.id && !access.canEdit(person, actor)) {
            throw ForbiddenException()
        }

        return queue.submit(
            person, id, ChangeKind.DELETE_CREDIT, actor, REMOVE_CREDIT,
            CreditInput(DomainCreditKind.valueOf(entry.kind.name), entry.description),
            reason = reason,
        )
    }

    fun apply(request: ModerationEntity, input: CreditInput) {
        entries.save(
            CreditEntryEntity(
                id = request.targetId, personId = request.personId,
                kind = CreditKind.valueOf(input.kind.name), description = input.description,
                authorId = request.authorId, authorName = request.authorName, createdAt = clock.instant(),
            ),
        )
    }

    fun reject(id: UUID) {
        entries.findById(id).ifPresent { if (!it.published) it.deleted = true }
    }

    @Transactional
    fun proposeEdit(id: UUID, input: CreditInput, actor: Actor): ModerationReceipt {
        val row = live(id)
        val person = access.locked(row.personId)
        pageRestrictions.ensure(row.personId, actor, PageRestrictionScope.LOANS)
        if (row.authorId != actor.id && !access.canEdit(person, actor)) throw ForbiddenException()
        if (input.description.isBlank()) throw InvalidInputException()
        return queue.submit(
            person,
            id,
            ChangeKind.UPDATE_CREDIT,
            actor,
            EDIT_CREDIT,
            input.copy(description = input.description.trim()),
            previousPayload = mapOf("kind" to row.kind, "description" to row.description),
        )
    }

    fun applyEdit(id: UUID, input: CreditInput) {
        val row = live(id)
        row.kind = CreditKind.valueOf(input.kind.name)
        row.description = input.description
    }

    fun live(id: UUID): CreditEntryEntity {
        val row = entries.findById(id).orElseThrow { NotFoundException(ErrorCode.CONTENT_NOT_FOUND) }

        if (row.deleted) {
            throw NotFoundException(ErrorCode.CONTENT_NOT_FOUND)
        }

        return row
    }
}
