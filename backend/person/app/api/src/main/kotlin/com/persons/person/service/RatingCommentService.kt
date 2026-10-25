package com.persons.person.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.RatingEntity
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.dao.repository.RatingRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.RatingComment
import com.persons.person.domain.ReviewStatus
import com.persons.person.exception.impl.NotFoundException
import org.springframework.stereotype.Service
import java.time.Clock
import java.util.UUID

private const val COMMENT_REVIEW = "Комментарий к оценке"
private const val REMOVED_RATING = "Оценка удалена автором"

@Service
class RatingCommentService(
    private val requests: ModerationRepository,
    private val queue: ModerationQueueService,
    private val ratings: RatingRepository,
    private val mapper: ObjectMapper,
    private val clock: Clock,
) {
    fun propose(person: PersonEntity, rating: RatingEntity, text: String, actor: Actor) {
        val normalized = text.trim()
        val pending = requests.pendingChanges(
            listOf(rating.id),
            actor.id,
            ChangeKind.UPDATE_RATING_COMMENT,
        ).firstOrNull()
        if (pending != null) {
            pending.payload = mapper.writeValueAsString(RatingComment(normalized))
            queue.reviewSubmission(pending, actor.administrator)
        } else if (rating.comment.orEmpty() != normalized) {
            queue.submit(
                person,
                rating.id,
                ChangeKind.UPDATE_RATING_COMMENT,
                actor,
                COMMENT_REVIEW,
                RatingComment(normalized),
                previousPayload = RatingComment(rating.comment.orEmpty()),
            )
        }
    }

    fun apply(id: UUID, input: RatingComment) {
        ratings.findById(id).orElseThrow { NotFoundException() }.comment = input.text.ifBlank { null }
    }

    fun cancel(id: UUID, actor: Actor) {
        requests.pendingChanges(listOf(id), actor.id, ChangeKind.UPDATE_RATING_COMMENT).stream().forEach {
            it.status = ReviewStatus.REJECTED
            it.reason = REMOVED_RATING
            it.reviewedAt = clock.instant()
            it.reviewedBy = actor.id
        }
    }
}
