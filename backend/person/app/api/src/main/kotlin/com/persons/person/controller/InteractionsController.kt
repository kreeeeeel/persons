package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.contract.api.InteractionsApi
import com.persons.person.contract.dto.CommentInput
import com.persons.person.contract.dto.CommentPage
import com.persons.person.contract.dto.CreditInput
import com.persons.person.contract.dto.CreditPage
import com.persons.person.contract.dto.FeedSort
import com.persons.person.contract.dto.LikeState
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.RatingInput
import com.persons.person.contract.dto.RatingPage
import com.persons.person.contract.dto.RatingState
import com.persons.person.domain.FeedOrder
import com.persons.person.exception.impl.InvalidInputException
import com.persons.person.service.CommentService
import com.persons.person.service.CreditService
import com.persons.person.service.MomentService
import com.persons.person.service.RatingFeedService
import com.persons.person.service.ReactionService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class InteractionsController(
    private val actors: ActorResolver,
    private val comments: CommentService,
    private val credit: CreditService,
    private val moments: MomentService,
    private val reactions: ReactionService,
    private val ratingFeed: RatingFeedService,
) : InteractionsApi {
    override fun listComments(
        id: UUID,
        mine: Boolean,
        sort: FeedSort,
        page: Int,
        size: Int,
        momentId: UUID?,
        mediaId: UUID?,
    ): ResponseEntity<CommentPage> = ResponseEntity.ok(
        comments.page(
            id, momentId, page, size, if (mine) actors.required() else actors.optional(),
            mediaId, FeedOrder.valueOf(sort.name), mine,
        ),
    )

    override fun editComment(id: UUID, commentInput: CommentInput): ResponseEntity<ModerationReceipt> =
        ResponseEntity.accepted().body(comments.proposeEdit(id, commentInput, actors.required()))

    override fun editCredit(id: UUID, creditInput: CreditInput): ResponseEntity<ModerationReceipt> =
        ResponseEntity.accepted().body(credit.proposeEdit(id, creditInput, actors.required()))

    override fun getRating(id: UUID): ResponseEntity<RatingState> =
        ResponseEntity.ok(reactions.visibleState(id, actors.optional()))

    override fun listRatings(id: UUID, sort: FeedSort, page: Int, size: Int): ResponseEntity<RatingPage> =
        ResponseEntity.ok(ratingFeed.page(id, page, size, actors.optional(), FeedOrder.valueOf(sort.name)))

    override fun createComment(id: UUID, commentInput: CommentInput): ResponseEntity<ModerationReceipt> =
        ResponseEntity.accepted().body(comments.propose(id, commentInput, actors.required()))

    override fun deleteComment(id: UUID): ResponseEntity<ModerationReceipt> =
        ResponseEntity.accepted().body(comments.remove(id, actors.required()))

    override fun listCredit(id: UUID, mine: Boolean, sort: FeedSort, page: Int, size: Int): ResponseEntity<CreditPage> =
        ResponseEntity.ok(
            credit.page(
                id, page, size, if (mine) actors.required() else actors.optional(), FeedOrder.valueOf(sort.name), mine,
            ),
        )

    override fun createCredit(id: UUID, creditInput: CreditInput): ResponseEntity<ModerationReceipt> =
        ResponseEntity.accepted().body(credit.propose(id, creditInput, actors.required()))

    override fun deleteCredit(id: UUID): ResponseEntity<ModerationReceipt> =
        ResponseEntity.accepted().body(credit.remove(id, actors.required()))

    override fun ratePerson(id: UUID, ratingInput: RatingInput): ResponseEntity<RatingState> {
        val actor = actors.required()
        if (ratingInput.optionId == null && ratingInput.emoji == null) throw InvalidInputException()
        return ResponseEntity.ok(
            reactions.rate(
                id,
                ratingInput.optionId,
                actor,
                ratingInput.value ?: 5,
                ratingInput.emoji,
                ratingInput.comment,
            ),

        )
    }

    override fun removeRating(id: UUID): ResponseEntity<RatingState> =
        ResponseEntity.ok(reactions.rate(id, null, actors.required()))

    override fun likeMoment(id: UUID): ResponseEntity<LikeState> =
        ResponseEntity.ok(moments.react(id, true, actors.required()))

    override fun unlikeMoment(id: UUID): ResponseEntity<LikeState> =
        ResponseEntity.ok(moments.react(id, false, actors.required()))
}
