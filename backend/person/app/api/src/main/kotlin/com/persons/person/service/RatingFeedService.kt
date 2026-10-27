package com.persons.person.service

import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.contract.dto.PersonRating
import com.persons.person.contract.dto.RatingPage
import com.persons.person.dao.repository.RatingRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.ContentKind
import com.persons.person.domain.FeedOrder
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.ZoneOffset
import java.util.UUID
import java.util.stream.Collectors

@Service
class RatingFeedService(
    private val contentLikes: ContentLikeService,
    private val ratings: RatingRepository,
    private val authorProfiles: AuthorProfileService,
    private val access: PersonAccessService,
    private val pending: PendingTextService,
) {
    @Transactional(readOnly = true)
    fun page(personId: UUID, page: Int, size: Int, actor: Actor?, order: FeedOrder = FeedOrder.NEWEST): RatingPage {
        access.visible(personId, actor)
        val rows = ratings.page(personId, PageRequest.of(page, size), order)
        val votes = contentLikes.states(
            ContentKind.RATING,
            rows.content.stream().map { it.id }.toList(),
            actor,
        )
        val drafts = pending.texts(
            rows.content.stream().map {
                it.id
            }.toList(),
            ChangeKind.UPDATE_RATING_COMMENT, actor,
        )
        val authors = authorProfiles.profiles(
            rows.content.stream().collect(Collectors.toMap({ it.userId }, { it.authorName })),
        )
        return RatingPage(
            rows.content.stream().map {
                PersonRating(
                    id = it.id, value = it.value, emoji = it.emoji, authorName = authors.getValue(it.userId).authorName,
                    mine = it.userId == actor?.id,
                    authorId = it.userId,
                    createdAt = it.createdAt.atOffset(ZoneOffset.UTC), authorTag = authors[it.userId]?.authorTag,
                    authorAvatarUrl = authors[it.userId]?.authorAvatarUrl,
                    comment = drafts[it.id] ?: it.comment,
                    likes = votes[it.id]?.count ?: 0, likedByMe = votes[it.id]?.liked ?: false,
                    dislikes = votes[it.id]?.dislikes ?: 0, dislikedByMe = votes[it.id]?.disliked ?: false,
                    commentStatus = if (it.id in
                        drafts
                    ) {
                        ModerationStatus.PENDING
                    } else {
                        it.comment?.let { ModerationStatus.APPROVED }
                    },
                )
            }.toList(),
            rows.totalElements, page, size,
        )
    }
}
