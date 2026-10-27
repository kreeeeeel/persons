package com.persons.person.component

import com.persons.person.contract.dto.Comment
import com.persons.person.contract.dto.CommunityFeedEvent
import com.persons.person.contract.dto.CommunityFeedKind
import com.persons.person.contract.dto.CreditEntry
import com.persons.person.contract.dto.CreditKind
import com.persons.person.contract.dto.MediaKind
import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.contract.dto.PersonRating
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.CreditEntryRepository
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.RatingRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ContentKind
import com.persons.person.domain.FeedEntry
import com.persons.person.service.AuthorProfileService
import com.persons.person.service.ContentLikeService
import com.persons.person.service.PersonAccessService
import com.persons.person.transformer.toSummary
import org.springframework.stereotype.Component
import java.time.ZoneOffset
import java.util.UUID
import java.util.stream.Collectors
import java.util.stream.Stream

@Component
class CommunityFeedTextAssembler(
    private val comments: CommentRepository,
    private val ratings: RatingRepository,
    private val credits: CreditEntryRepository,
    private val media: MediaRepository,
    private val authors: AuthorProfileService,
    private val likes: ContentLikeService,
    private val access: PersonAccessService,
) {
    fun assemble(entries: List<FeedEntry>, pages: Map<UUID, PersonEntity>, actor: Actor?): List<CommunityFeedEvent> =
        Stream.of(
            comments(entries, pages, actor), ratings(entries, pages, actor), credits(entries, pages, actor),
        ).flatMap { it.stream() }.toList()

    private fun comments(
        entries: List<FeedEntry>,
        pages: Map<UUID, PersonEntity>,
        actor: Actor?,
    ): List<CommunityFeedEvent> {
        val selected = entries.stream().filter {
            it.kind == CommunityFeedKind.WALL ||
                it.kind == CommunityFeedKind.COMMENT
        }
            .collect(Collectors.toMap({ UUID.fromString(it.sourceId) }, { it }))
        if (selected.isEmpty()) return emptyList()
        val rows = comments.findAllById(selected.keys)
        val profiles = authors.profiles(
            rows.stream().collect(
                Collectors.toMap({
                    it.authorId
                }, { it.authorName }, { first, _ -> first }),
            ),
        )
        val votes = likes.states(ContentKind.COMMENT, selected.keys.toList(), actor)
        val contexts = media.findAllById(
            rows.stream().map {
                it.mediaId ?: it.momentId
            }.filter { it != null }.distinct().toList(),
        )
            .stream().collect(Collectors.toMap({ it.id }, { MediaKind.valueOf(it.kind.name) }))
        return rows.stream().map { row ->
            val page = pages.getValue(row.personId)
            val author = profiles.getValue(row.authorId)
            val vote = votes.getValue(row.id)
            val canEdit = actor?.id == row.authorId || access.canEdit(page, actor)
            selected.getValue(row.id).event(page.toSummary()).copy(
                comment = Comment(
                    row.id, row.text, author.authorName, row.createdAt.atOffset(ZoneOffset.UTC), canEdit,
                    momentId = row.momentId, mediaId = row.mediaId, authorId = row.authorId,
                    authorTag = author.authorTag, authorAvatarUrl = author.authorAvatarUrl, canEdit = canEdit,
                    moderationStatus = ModerationStatus.APPROVED,
                    likes = vote.count, likedByMe = vote.liked, dislikes = vote.dislikes, dislikedByMe = vote.disliked,
                ),
                contextMediaKind = contexts[row.mediaId ?: row.momentId],
            )
        }.toList()
    }

    private fun ratings(
        entries: List<FeedEntry>,
        pages: Map<UUID, PersonEntity>,
        actor: Actor?,
    ): List<CommunityFeedEvent> {
        val selected = select(entries, CommunityFeedKind.RATING)
        if (selected.isEmpty()) return emptyList()
        val rows = ratings.findAllById(selected.keys)
        val profiles = authors.profiles(
            rows.stream().collect(
                Collectors.toMap({
                    it.userId
                }, { it.authorName }, { first, _ -> first }),
            ),
        )
        val votes = likes.states(ContentKind.RATING, selected.keys.toList(), actor)
        return rows.stream().map { row ->
            val author = profiles.getValue(row.userId)
            val vote = votes.getValue(row.id)
            selected.getValue(row.id).event(pages.getValue(row.personId).toSummary()).copy(
                rating = PersonRating(
                    id = row.id, value = row.value, emoji = row.emoji, authorName = author.authorName,
                    mine = actor?.id == row.userId, createdAt = row.createdAt.atOffset(ZoneOffset.UTC),
                    authorId = row.userId,
                    comment = row.comment,
                    authorTag = author.authorTag, authorAvatarUrl = author.authorAvatarUrl,
                    commentStatus = row.comment?.let { ModerationStatus.APPROVED },
                    likes = vote.count, likedByMe = vote.liked, dislikes = vote.dislikes, dislikedByMe = vote.disliked,
                ),
            )
        }.toList()
    }

    private fun credits(
        entries: List<FeedEntry>,
        pages: Map<UUID, PersonEntity>,
        actor: Actor?,
    ): List<CommunityFeedEvent> {
        val selected = select(entries, CommunityFeedKind.LOAN)
        if (selected.isEmpty()) return emptyList()
        val rows = credits.findAllById(selected.keys)
        val profiles = authors.profiles(
            rows.stream().collect(
                Collectors.toMap({
                    it.authorId
                }, { it.authorName }, { first, _ -> first }),
            ),
        )
        val votes = likes.states(ContentKind.LOAN, selected.keys.toList(), actor)
        return rows.stream().map { row ->
            val page = pages.getValue(row.personId)
            val author = profiles.getValue(row.authorId)
            val vote = votes.getValue(row.id)
            val canEdit = actor?.id == row.authorId || access.canEdit(page, actor)
            selected.getValue(row.id).event(page.toSummary()).copy(
                credit = CreditEntry(
                    row.id, CreditKind.valueOf(row.kind.name), row.description, author.authorName,
                    row.createdAt.atOffset(ZoneOffset.UTC), canEdit,
                    authorTag = author.authorTag, authorId = row.authorId,
                    authorAvatarUrl = author.authorAvatarUrl,
                    moderationStatus = ModerationStatus.APPROVED,
                    likes = vote.count, likedByMe = vote.liked, dislikes = vote.dislikes, dislikedByMe = vote.disliked,
                ),
            )
        }.toList()
    }

    private fun select(entries: List<FeedEntry>, kind: CommunityFeedKind): Map<UUID, FeedEntry> = entries.stream()
        .filter { it.kind == kind }.collect(Collectors.toMap({ UUID.fromString(it.sourceId) }, { it }))
}
