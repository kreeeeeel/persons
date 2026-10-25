package com.persons.person.service

import com.persons.person.contract.dto.Comment
import com.persons.person.contract.dto.CommentInput
import com.persons.person.contract.dto.CommentPage
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.MomentRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.ContentKind
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

private const val ADD_COMMENT = "Новый комментарий"
private const val REMOVE_COMMENT = "Удаление комментария"
private const val EDIT_COMMENT = "Изменение комментария"

@Service
class CommentService(
    private val contentLikes: ContentLikeService,
    private val comments: CommentRepository,
    private val moments: MomentRepository,
    private val authorProfiles: AuthorProfileService,
    private val media: MediaService,
    private val access: PersonAccessService,
    private val queue: ModerationQueueService,
    private val clock: Clock,
    private val pending: PendingTextService,
    private val pageRestrictions: PageRestrictionService,
) {
    @Transactional(readOnly = true)
    fun page(
        personId: UUID,
        momentId: UUID?,
        page: Int,
        size: Int,
        actor: Actor?,
        mediaId: UUID? = null,
        order: FeedOrder = FeedOrder.NEWEST,
        mine: Boolean = false,
    ): CommentPage {
        val person = access.visible(personId, actor)
        val target = target(personId, momentId, mediaId, actor)
        val rows = comments.page(personId, target, PageRequest.of(page, size), actor?.id, order, mine)
        val votes = contentLikes.states(
            ContentKind.COMMENT,
            rows.content.stream().map { it.id }.toList(),
            actor,
        )
        val drafts = pending.texts(rows.content.stream().map { it.id }.toList(), ChangeKind.UPDATE_COMMENT, actor)
        val authors = authorProfiles.profiles(
            rows.content.stream().collect(
                java.util.stream.Collectors.toMap({ it.authorId }, { it.authorName }, { first, _ -> first }),
            ),
        )

        return CommentPage(
            rows.content.stream().map {
                Comment(
                    it.id, drafts[it.id] ?: it.text, authors.getValue(it.authorId).authorName,
                    it.createdAt.atOffset(ZoneOffset.UTC),
                    it.published && (actor?.id == it.authorId || access.canEdit(person, actor)), it.momentId,
                    mediaId = it.mediaId, authorId = it.authorId, authorTag = authors[it.authorId]?.authorTag,
                    authorAvatarUrl = authors[it.authorId]?.authorAvatarUrl,
                    canEdit = it.published && (actor?.id == it.authorId || access.canEdit(person, actor)),
                    likes = votes[it.id]?.count ?: 0, likedByMe = votes[it.id]?.liked ?: false,
                    dislikes = votes[it.id]?.dislikes ?: 0, dislikedByMe = votes[it.id]?.disliked ?: false,
                    moderationStatus = if (!it.published ||
                        it.id in drafts
                    ) {
                        ModerationStatus.PENDING
                    } else {
                        ModerationStatus.APPROVED
                    },
                )
            }.toList(),
            rows.totalElements, page, size,
        )
    }

    @Transactional
    fun propose(personId: UUID, input: CommentInput, actor: Actor): ModerationReceipt {
        access.locked(personId)
        val person = access.visible(personId, actor)
        pageRestrictions.ensure(personId, actor, PageRestrictionScope.COMMENTS)
        val mediaId = target(personId, input.momentId, input.mediaId, actor)

        if (input.text.isBlank()) {
            throw InvalidInputException()
        }

        val id = UUID.randomUUID()
        comments.save(
            CommentEntity(
                id = id, personId = personId, momentId = input.momentId, mediaId = mediaId,
                authorId = actor.id,
                authorName = actor.name,
                text = input.text.trim(),
                createdAt = clock.instant(),
                published = false,

            ),
        )
        return queue.submit(
            person, id, ChangeKind.CREATE_COMMENT, actor, ADD_COMMENT,
            input.copy(text = input.text.trim()),
        )
    }

    @Transactional
    fun remove(id: UUID, actor: Actor, reason: String? = null): ModerationReceipt {
        val comment = live(id)
        val person = access.visible(comment.personId, actor)

        if (comment.authorId != actor.id && !access.canEdit(person, actor)) {
            throw ForbiddenException()
        }

        return queue.submit(
            person, id, ChangeKind.DELETE_COMMENT, actor, REMOVE_COMMENT,
            CommentInput(comment.text, comment.momentId, comment.mediaId),
            reason = reason,
        )
    }

    fun apply(request: ModerationEntity, input: CommentInput) {
        val target = target(request.personId, input.momentId, input.mediaId, null)
        comments.save(
            CommentEntity(
                id = request.targetId, personId = request.personId, momentId = input.momentId, mediaId = target,
                authorId = request.authorId, authorName = request.authorName,
                text = input.text, createdAt = clock.instant(),
            ),
        )
    }

    fun reject(id: UUID) {
        comments.findById(id).ifPresent { if (!it.published) it.deleted = true }
    }

    @Transactional
    fun proposeEdit(id: UUID, input: CommentInput, actor: Actor): ModerationReceipt {
        val row = live(id)
        val person = access.locked(row.personId)
        pageRestrictions.ensure(row.personId, actor, PageRestrictionScope.COMMENTS)
        if (row.authorId != actor.id && !access.canEdit(person, actor)) throw ForbiddenException()
        if (input.text.isBlank() ||
            (input.mediaId != null && input.mediaId != row.mediaId) ||
            (input.momentId != null && input.momentId != row.momentId)
        ) {
            throw InvalidInputException()
        }
        return queue.submit(
            person,
            id,
            ChangeKind.UPDATE_COMMENT,
            actor,
            EDIT_COMMENT,
            input.copy(text = input.text.trim()),
            previousPayload = mapOf("text" to row.text),
        )
    }

    fun applyEdit(id: UUID, input: CommentInput) {
        live(id).text = input.text
    }

    private fun target(personId: UUID, momentId: UUID?, mediaId: UUID?, actor: Actor?): UUID? {
        if (momentId != null && mediaId != null && momentId != mediaId) throw InvalidInputException()
        validateMoment(personId, momentId)
        val id = mediaId ?: momentId ?: return null
        if (media.interactive(id, actor).personId != personId) throw NotFoundException(ErrorCode.CONTENT_NOT_FOUND)
        return id
    }

    fun live(id: UUID): CommentEntity {
        val row = comments.findById(id).orElseThrow { NotFoundException(ErrorCode.CONTENT_NOT_FOUND) }

        if (row.deleted) {
            throw NotFoundException(ErrorCode.CONTENT_NOT_FOUND)
        }

        return row
    }

    private fun validateMoment(personId: UUID, momentId: UUID?) {
        if (momentId != null) {
            val moment = moments.findById(momentId).orElseThrow { NotFoundException(ErrorCode.CONTENT_NOT_FOUND) }

            if (moment.personId != personId || moment.deleted) {
                throw NotFoundException(ErrorCode.CONTENT_NOT_FOUND)
            }
        }
    }
}
