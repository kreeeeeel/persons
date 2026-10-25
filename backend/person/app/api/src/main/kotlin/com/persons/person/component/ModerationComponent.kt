package com.persons.person.component

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.contract.dto.CommentInput
import com.persons.person.contract.dto.CreditInput
import com.persons.person.contract.dto.Decision
import com.persons.person.contract.dto.DecisionInput
import com.persons.person.contract.dto.MediaEditInput
import com.persons.person.contract.dto.ModerationItem
import com.persons.person.contract.dto.ProfileInput
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.MediaEditReview
import com.persons.person.domain.ModerationSubmitted
import com.persons.person.domain.OwnerChange
import com.persons.person.domain.OwnershipClaim
import com.persons.person.domain.RatingComment
import com.persons.person.domain.ReviewStatus
import com.persons.person.exception.impl.ConflictException
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.InvalidInputException
import com.persons.person.maintenance.PersonAggregateStore
import com.persons.person.service.CommentService
import com.persons.person.service.CreditService
import com.persons.person.service.GalleryService
import com.persons.person.service.MediaService
import com.persons.person.service.ModerationQueueService
import com.persons.person.service.NotificationService
import com.persons.person.service.OwnershipService
import com.persons.person.service.PersonAccessService
import com.persons.person.service.ProfileService
import com.persons.person.service.PublicationPolicyService
import com.persons.person.service.RatingCommentService
import com.persons.person.service.ReactionService
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.util.UUID

private const val DELETED_PERSON_REASON = "Персона удалена после модерации"
private val AGGREGATE_CHANGES = setOf(
    ChangeKind.CREATE_PERSON, ChangeKind.CREATE_CREDIT, ChangeKind.UPDATE_CREDIT,
    ChangeKind.DELETE_CREDIT, ChangeKind.DELETE_PERSON,
)

@Component
class ModerationComponent(
    private val aggregates: PersonAggregateStore,
    private val queue: ModerationQueueService,
    private val access: PersonAccessService,
    private val profiles: ProfileService,
    private val comments: CommentService,
    private val credit: CreditService,
    private val media: MediaService,
    private val notifications: NotificationService,
    private val mapper: ObjectMapper,
    private val clock: Clock,
    private val ownership: OwnershipService,
    private val gallery: GalleryService,
    private val ratingComments: RatingCommentService,
    private val policy: PublicationPolicyService,
    private val reactions: ReactionService,
) {
    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    fun submitted(event: ModerationSubmitted) {
        val person = access.locked(queue.personId(event.id))
        val request = queue.locked(event.id)
        if (request.status != ReviewStatus.PENDING || (!event.administrator && policy.requiresReview(request))) return

        request.reviewedAt = clock.instant()
        if (event.administrator) request.reviewedBy = request.authorId
        apply(request, person)
        if (request.kind in AGGREGATE_CHANGES) aggregates.request(person.id)
        request.status = ReviewStatus.APPROVED
    }

    @Transactional
    fun decide(id: UUID, input: DecisionInput, actor: Actor): ModerationItem {
        if (!actor.administrator) {
            throw ForbiddenException()
        }

        val person = access.locked(queue.personId(id))
        val request = queue.locked(id)

        if (request.status != ReviewStatus.PENDING) {
            throw ConflictException()
        }
        if (input.decision == Decision.REJECT && input.reason.isNullOrBlank()) {
            throw InvalidInputException()
        }

        request.reviewedAt = clock.instant()
        request.reviewedBy = actor.id
        request.reason = input.reason?.trim()?.ifEmpty { null }

        if (input.decision == Decision.APPROVE) {
            apply(request, person)
            if (request.kind in AGGREGATE_CHANGES) aggregates.request(person.id)
            request.status = ReviewStatus.APPROVED
        } else {
            request.status = ReviewStatus.REJECTED
            if (request.kind == ChangeKind.CREATE_COMMENT) comments.reject(request.targetId)
            if (request.kind == ChangeKind.CREATE_CREDIT) credit.reject(request.targetId)
            if (request.kind == ChangeKind.CREATE_PERSON && !person.published) {
                person.deleted = true
                person.deletedAt = clock.instant()
                person.ownerAccountId = null
            }

            if (request.kind == ChangeKind.PUBLISH_MEDIA || request.kind == ChangeKind.CLAIM_OWNERSHIP) {
                media.reject(request.targetId)
            }
        }

        notifications.decision(request)

        return queue.dto(request)
    }

    private fun apply(request: ModerationEntity, person: PersonEntity) {
        when (request.kind) {
            ChangeKind.UPDATE_RATING_COMMENT -> ratingComments.apply(
                request.targetId,
                mapper.readValue(
                    request.payload,
                    RatingComment::class.java,
                ),
            )
            ChangeKind.CREATE_PERSON -> profiles.apply(
                person, mapper.readValue(request.payload, ProfileInput::class.java), true,
            )
            ChangeKind.UPDATE_PERSON -> profiles.apply(
                person, mapper.readValue(request.payload, ProfileInput::class.java), false,
            )
            ChangeKind.LINK_ACCOUNT -> ownership.link(
                person,
                mapper.readValue(
                    request.payload,
                    OwnerChange::class.java,
                ).ownerId,
            )
            ChangeKind.CLAIM_OWNERSHIP -> ownership.approve(
                person,
                mapper.readValue(
                    request.payload,
                    OwnershipClaim::class.java,
                ),
            )
            ChangeKind.UPDATE_MEDIA -> {
                val input = mapper.readValue(request.payload, MediaEditReview::class.java)
                gallery.applyEdit(request.targetId, MediaEditInput(input.caption, input.taggedPersonIds))
            }
            ChangeKind.UPDATE_COMMENT -> comments.applyEdit(
                request.targetId,
                mapper.readValue(
                    request.payload,
                    CommentInput::class.java,
                ),
            )
            ChangeKind.UPDATE_CREDIT -> credit.applyEdit(
                request.targetId,
                mapper.readValue(
                    request.payload,
                    CreditInput::class.java,
                ),
            )
            ChangeKind.CREATE_COMMENT -> comments.apply(
                request, mapper.readValue(request.payload, CommentInput::class.java),
            )
            ChangeKind.CREATE_CREDIT -> credit.apply(
                request, mapper.readValue(request.payload, CreditInput::class.java),
            )
            ChangeKind.PUBLISH_MEDIA -> media.publish(request.targetId, person)
            ChangeKind.DELETE_COMMENT -> {
                val comment = comments.live(request.targetId)
                comment.deleted = true
                notifications.removed(comment.authorId, request)
            }
            ChangeKind.DELETE_CREDIT -> {
                val entry = credit.live(request.targetId)
                entry.deleted = true
                notifications.removed(entry.authorId, request)
            }
            ChangeKind.DELETE_RATING -> notifications.removed(reactions.remove(request.targetId), request)
            ChangeKind.DELETE_MEDIA -> notifications.removed(media.remove(request.targetId, person), request)
            ChangeKind.DELETE_PERSON -> {
                person.deleted = true
                person.deletedAt = clock.instant()
                person.ownerAccountId?.let { notifications.removed(it, request) }
                person.ownerAccountId = null
                person.verified = false
                queue.pendingRows(person.id).stream().filter { it.id != request.id }.forEach {
                    it.status = ReviewStatus.REJECTED
                    it.reviewedAt = clock.instant()
                    it.reviewedBy = request.reviewedBy
                    it.reason = DELETED_PERSON_REASON

                    if (it.kind == ChangeKind.PUBLISH_MEDIA || it.kind == ChangeKind.CLAIM_OWNERSHIP) {
                        media.reject(it.targetId)
                    }

                    notifications.decision(it)
                }
            }
        }
    }
}
