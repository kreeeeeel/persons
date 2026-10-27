package com.persons.person.component

import com.persons.person.contract.dto.AdminContentItem
import com.persons.person.contract.dto.Comment
import com.persons.person.contract.dto.CreditEntry
import com.persons.person.contract.dto.CreditKind
import com.persons.person.contract.dto.MediaKind
import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.contract.dto.MyPublication
import com.persons.person.contract.dto.PersonRating
import com.persons.person.contract.dto.PersonSummary
import com.persons.person.contract.dto.PublicationKind
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.CreditEntryRepository
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.RatingRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.AuthorProfile
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.ContentKind
import com.persons.person.service.AuthorProfileService
import com.persons.person.service.ContentLikeService
import com.persons.person.service.PendingTextService
import org.springframework.stereotype.Component
import java.time.ZoneOffset
import java.util.UUID
import java.util.stream.Collectors
import java.util.stream.Stream

@Component
class PublicationTextAssembler(
    private val comments: CommentRepository,
    private val ratings: RatingRepository,
    private val credits: CreditEntryRepository,
    private val media: MediaRepository,
    private val authors: AuthorProfileService,
    private val likes: ContentLikeService,
    private val pending: PendingTextService,
) {
    fun assemble(
        rows: List<AdminContentItem>,
        actor: Actor,
        pages: Map<UUID, PersonSummary>,
        viewer: Actor? = actor,
    ): List<MyPublication> {
        if (rows.stream().noneMatch {
                it.kind.name == PublicationKind.COMMENT.name ||
                    it.kind.name == PublicationKind.RATING.name ||
                    it.kind.name == PublicationKind.CREDIT.name
            }
        ) {
            return emptyList()
        }
        val author = authors.profiles(mapOf(actor.id to actor.name)).getValue(actor.id)
        return Stream.of(
            commentPublications(rows, actor, author, pages, viewer),
            ratingPublications(rows, actor, author, pages, viewer),
            creditPublications(rows, actor, author, pages, viewer),
        ).flatMap { it.stream() }.toList()
    }

    private fun commentPublications(
        rows: List<AdminContentItem>,
        actor: Actor,
        author: AuthorProfile,
        pages: Map<UUID, PersonSummary>,
        viewer: Actor?,
    ): List<MyPublication> {
        val commentIds = ids(rows, PublicationKind.COMMENT)
        val editable = viewer?.id == actor.id || viewer?.administrator == true
        val votes = likes.states(ContentKind.COMMENT, commentIds, viewer)
        val drafts = pending.texts(commentIds, ChangeKind.UPDATE_COMMENT, viewer?.takeIf { it.id == actor.id })
        val contexts = media.findAllById(
            rows.stream().map {
                it.contextMediaId
            }.filter { it != null }.toList(),
        ).stream()
            .collect(Collectors.toMap({ it.id }, { MediaKind.valueOf(it.kind.name) }))
        return comments.findAllById(commentIds).stream().map {
            val vote = votes[it.id]
            val date = it.createdAt.atOffset(ZoneOffset.UTC)
            MyPublication(
                it.id, PublicationKind.COMMENT, pages.getValue(it.personId), date,
                comment = Comment(
                    it.id, drafts[it.id] ?: it.text, author.authorName, date, it.published && editable,
                    momentId = it.momentId, mediaId = it.mediaId, authorId = actor.id,
                    authorTag = author.authorTag, authorAvatarUrl = author.authorAvatarUrl,
                    canEdit =
                    it.published && editable,
                    moderationStatus = if (!it.published ||
                        it.id in drafts
                    ) {
                        ModerationStatus.PENDING
                    } else {
                        ModerationStatus.APPROVED
                    },
                    likes = vote?.count ?: 0, likedByMe = vote?.liked ?: false,
                    dislikes = vote?.dislikes ?: 0, dislikedByMe = vote?.disliked ?: false,
                ),
                contextMediaKind = contexts[it.mediaId ?: it.momentId],
            )
        }.toList()
    }

    private fun ratingPublications(
        rows: List<AdminContentItem>,
        actor: Actor,
        author: AuthorProfile,
        pages: Map<UUID, PersonSummary>,
        viewer: Actor?,
    ): List<MyPublication> {
        val ratingIds = ids(rows, PublicationKind.RATING)
        val ratingVotes = likes.states(ContentKind.RATING, ratingIds, viewer)
        val ratingDrafts = pending.texts(
            ratingIds, ChangeKind.UPDATE_RATING_COMMENT,
            viewer?.takeIf {
                it.id == actor.id
            },
        )
        return ratings.findAllById(ratingIds).stream().map {
            val vote = ratingVotes[it.id]
            val date = it.createdAt.atOffset(ZoneOffset.UTC)
            MyPublication(
                it.id, PublicationKind.RATING, pages.getValue(it.personId), date,
                rating = PersonRating(
                    id = it.id, value = it.value, emoji = it.emoji, authorName = author.authorName,
                    mine = viewer?.id == actor.id, createdAt = date, authorId = actor.id,
                    comment = ratingDrafts[it.id] ?: it.comment,
                    authorTag = author.authorTag, authorAvatarUrl = author.authorAvatarUrl,
                    commentStatus = if (it.id in
                        ratingDrafts
                    ) {
                        ModerationStatus.PENDING
                    } else {
                        it.comment?.let { ModerationStatus.APPROVED }
                    },
                    likes = vote?.count ?: 0, likedByMe = vote?.liked ?: false,
                    dislikes = vote?.dislikes ?: 0, dislikedByMe = vote?.disliked ?: false,
                ),
            )
        }.toList()
    }

    private fun creditPublications(
        rows: List<AdminContentItem>,
        actor: Actor,
        author: AuthorProfile,
        pages: Map<UUID, PersonSummary>,
        viewer: Actor?,
    ): List<MyPublication> {
        val creditIds = ids(rows, PublicationKind.CREDIT)
        val editable = viewer?.id == actor.id || viewer?.administrator == true
        val creditVotes = likes.states(ContentKind.LOAN, creditIds, viewer)
        val creditDrafts = pending.texts(
            creditIds, ChangeKind.UPDATE_CREDIT,
            viewer?.takeIf {
                it.id == actor.id
            },
            "description",
        )
        return credits.findAllById(creditIds).stream().map {
            val vote = creditVotes[it.id]
            val date = it.createdAt.atOffset(ZoneOffset.UTC)
            MyPublication(
                it.id, PublicationKind.CREDIT, pages.getValue(it.personId), date,
                credit = CreditEntry(
                    it.id, CreditKind.valueOf(it.kind.name), creditDrafts[it.id] ?: it.description,
                    author.authorName, date, it.published && editable,
                    authorTag = author.authorTag, authorId = actor.id,
                    authorAvatarUrl = author.authorAvatarUrl,
                    moderationStatus = if (!it.published ||
                        it.id in creditDrafts
                    ) {
                        ModerationStatus.PENDING
                    } else {
                        ModerationStatus.APPROVED
                    },
                    likes = vote?.count ?: 0, likedByMe = vote?.liked ?: false,
                    dislikes = vote?.dislikes ?: 0, dislikedByMe = vote?.disliked ?: false,
                ),
            )
        }.toList()
    }

    private fun ids(rows: List<AdminContentItem>, kind: PublicationKind): List<UUID> = rows.stream()
        .filter { it.kind.name == kind.name }.map { it.id }.toList()
}
