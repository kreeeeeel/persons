package com.persons.person.service

import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.contract.dto.RatingOption
import com.persons.person.contract.dto.RatingState
import com.persons.person.dao.entity.RatingEntity
import com.persons.person.dao.repository.ContentLikeRepository
import com.persons.person.dao.repository.RatingOptionRepository
import com.persons.person.dao.repository.RatingRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.ContentKind
import com.persons.person.domain.PageRestrictionScope
import com.persons.person.exception.impl.InvalidInputException
import com.persons.person.exception.impl.NotFoundException
import com.persons.person.maintenance.PersonAggregateStore
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.util.UUID

@Service
class ReactionService(
    private val aggregates: PersonAggregateStore,
    private val contentLikes: ContentLikeRepository,
    private val options: RatingOptionRepository,
    private val ratings: RatingRepository,
    private val access: PersonAccessService,
    private val clock: Clock,
    private val emojis: RatingEmojiPolicy,
    private val comments: RatingCommentService,
    private val pending: PendingTextService,
    private val pageRestrictions: PageRestrictionService,
) {
    fun visibleState(id: UUID, actor: Actor?): RatingState {
        access.visible(id, actor)
        return state(id, actor)
    }
    fun state(personId: UUID, actor: Actor?): RatingState {
        val aggregate = aggregates.get(personId)
        val counts = aggregates.optionCounts(personId)
        val current = actor?.let { ratings.byUser(personId, it.id) }
        val mine = current?.optionId
        val drafts = pending.texts(listOfNotNull(current?.id), ChangeKind.UPDATE_RATING_COMMENT, actor)
        val result = options.byPerson(personId).stream().filter { it.enabled }.map {
            RatingOption(it.id, it.emoji, it.label, counts[it.id] ?: 0, mine == it.id)
        }.toList()

        return RatingState(
            options = result,
            average = aggregate.ratingAverage,
            total = aggregate.ratingCount,
            value = current?.value,
            optionId = current?.optionId,
            emoji = current?.emoji,
            availableEmojis = emojis.available,
            comment = if (current != null) drafts[current.id] ?: current.comment else null,
            commentStatus = if (current != null &&
                current.id in drafts
            ) {
                ModerationStatus.PENDING
            } else {
                current?.comment?.let { ModerationStatus.APPROVED }
            },
            calculationPending = aggregate.calculationPending,
        )
    }

    fun remove(id: UUID): UUID {
        val row = ratings.findById(id).orElseThrow { NotFoundException() }
        contentLikes.clearTarget(ContentKind.RATING, id)
        ratings.delete(row)
        ratings.flush()
        aggregates.request(row.personId)
        return row.userId
    }

    @Transactional
    fun rate(
        personId: UUID,
        optionId: UUID?,
        actor: Actor,
        value: Int = 5,
        emoji: String? = null,
        comment: String? = null,
    ): RatingState {
        access.locked(personId)
        val person = access.visible(personId, actor)
        val current = ratings.byUser(personId, actor.id)

        if (optionId == null && emoji == null) {
            if (current != null) {
                comments.cancel(current.id, actor)
                contentLikes.clearTarget(ContentKind.RATING, current.id)
                ratings.delete(current)
                ratings.flush()
            }
        } else {
            val scopes = if (!comment.isNullOrBlank() && comment.trim() != current?.comment.orEmpty()) {
                arrayOf(PageRestrictionScope.RATINGS, PageRestrictionScope.COMMENTS)
            } else {
                arrayOf(PageRestrictionScope.RATINGS)
            }
            pageRestrictions.ensure(personId, actor, *scopes)
            if (value !in 1..5) {
                throw InvalidInputException()
            }
            val option = optionId?.let { options.findById(it).orElseThrow { InvalidInputException() } }

            if (option != null && (option.personId != personId || !option.enabled)) {
                throw InvalidInputException()
            }
            if (option != null && emoji != null && emoji != option.emoji) {
                throw InvalidInputException()
            }

            val rating = current ?: RatingEntity(personId = personId, userId = actor.id, createdAt = clock.instant())
            rating.optionId = option?.id
            rating.value = value
            rating.emoji = option?.emoji ?: emoji?.let(emojis::validate) ?: throw InvalidInputException()
            rating.authorName = actor.name
            rating.createdAt = clock.instant()
            ratings.saveAndFlush(rating)
            if (comment != null) comments.propose(person, rating, comment, actor)
        }

        aggregates.request(personId)
        return state(personId, actor)
    }
}
