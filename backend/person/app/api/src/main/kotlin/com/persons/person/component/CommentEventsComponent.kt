package com.persons.person.component

import com.persons.person.contract.dto.Comment
import com.persons.person.contract.dto.CommentEvent
import com.persons.person.contract.dto.CommentEventPage
import com.persons.person.contract.dto.MediaKind
import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ContentKind
import com.persons.person.service.AuthorProfileService
import com.persons.person.service.ContentLikeService
import com.persons.person.service.PersonAccessService
import com.persons.person.transformer.toSummary
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Isolation
import org.springframework.transaction.annotation.Transactional
import java.time.ZoneOffset
import java.util.stream.Collectors

@Component
class CommentEventsComponent(
    private val comments: CommentRepository,
    private val media: MediaRepository,
    private val persons: PersonRepository,
    private val authors: AuthorProfileService,
    private val likes: ContentLikeService,
    private val access: PersonAccessService,
) {
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    fun page(actor: Actor?, page: Int, size: Int): CommentEventPage {
        val rows = comments.events(PageRequest.of(page, size))
        if (rows.isEmpty) return CommentEventPage(emptyList(), rows.totalElements, page, size)
        val pages = persons.findAllById(rows.content.stream().map { it.personId }.distinct().toList()).stream()
            .collect(Collectors.toMap({ it.id }, { it }))
        val contexts = media.findAllById(
            rows.content.stream().map { requireNotNull(it.mediaId ?: it.momentId) }.distinct().toList(),
        ).stream().collect(Collectors.toMap({ it.id }, { MediaKind.valueOf(it.kind.name) }))
        val profiles = authors.profiles(
            rows.content.stream().collect(Collectors.toMap({ it.authorId }, { it.authorName }, { first, _ -> first })),
        )
        val votes = likes.states(ContentKind.COMMENT, rows.content.stream().map { it.id }.toList(), actor)
        return CommentEventPage(
            rows.content.stream().map { row ->
                val person = pages.getValue(row.personId)
                val author = profiles.getValue(row.authorId)
                val vote = votes[row.id]
                val canEdit = actor?.id == row.authorId || access.canEdit(person, actor)
                CommentEvent(
                    person.toSummary(),
                    Comment(
                        row.id, row.text, author.authorName, row.createdAt.atOffset(ZoneOffset.UTC), canEdit,
                        momentId = row.momentId, mediaId = row.mediaId, authorId = row.authorId,
                        authorTag = author.authorTag, authorAvatarUrl = author.authorAvatarUrl, canEdit = canEdit,
                        moderationStatus = ModerationStatus.APPROVED,
                        likes = vote?.count ?: 0, likedByMe = vote?.liked ?: false,
                        dislikes = vote?.dislikes ?: 0, dislikedByMe = vote?.disliked ?: false,
                    ),
                    contexts.getValue(requireNotNull(row.mediaId ?: row.momentId)),
                )
            }.toList(),
            rows.totalElements, page, size,
        )
    }
}
