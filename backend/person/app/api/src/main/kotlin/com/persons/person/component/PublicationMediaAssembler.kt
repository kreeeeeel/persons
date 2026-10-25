package com.persons.person.component

import com.persons.person.contract.dto.AdminContentItem
import com.persons.person.contract.dto.AdminContentKind
import com.persons.person.contract.dto.MediaReaction
import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.contract.dto.Moment
import com.persons.person.contract.dto.MyPublication
import com.persons.person.contract.dto.PersonSummary
import com.persons.person.contract.dto.Photo
import com.persons.person.contract.dto.PublicationKind
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.MediaViewRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import com.persons.person.service.MediaReactionService
import org.springframework.stereotype.Component
import java.time.ZoneOffset
import java.util.UUID

@Component
class PublicationMediaAssembler(
    private val media: MediaRepository,
    private val views: MediaViewRepository,
    private val comments: CommentRepository,
    private val reactions: MediaReactionService,
) {
    fun assemble(rows: List<AdminContentItem>, actor: Actor, pages: Map<UUID, PersonSummary>): List<MyPublication> {
        val ids = rows.stream().filter { it.kind == AdminContentKind.PHOTO || it.kind == AdminContentKind.MOMENT }
            .map { it.id }.toList()
        if (ids.isEmpty()) {
            return emptyList()
        }
        val counts = views.counts(ids)
        val commentCounts = comments.counts(ids)
        val votes = reactions.states(ids, actor)
        return media.findAllById(ids).stream().map {
            val date = it.createdAt.atOffset(ZoneOffset.UTC)
            val published = it.status == MediaStatus.PUBLISHED
            val status = if (published) ModerationStatus.APPROVED else ModerationStatus.PENDING
            if (it.kind == MediaKind.PHOTO) {
                MyPublication(
                    it.id, PublicationKind.PHOTO, pages.getValue(it.personId), date,
                    photo = Photo(
                        id = it.id, mediaId = it.id, title = it.caption, createdAt = date, canRemove = published,
                        views = counts[it.id] ?: 0, moderationStatus = status,
                    ),
                )
            } else {
                val vote = votes[it.id]
                MyPublication(
                    it.id, PublicationKind.MOMENT, pages.getValue(it.personId), date,
                    moment = Moment(
                        id = it.id, mediaId = it.id, title = it.caption, authorName = it.uploaderName, createdAt = date,
                        likes = vote?.likes ?: 0, liked = vote?.reaction == MediaReaction.LIKE,
                        comments = commentCounts[it.id] ?: 0, canRemove = published,
                        durationSeconds = it.durationSeconds, previewAvailable = it.previewObjectKey != null,
                        views = counts[it.id] ?: 0, moderationStatus = status,
                    ),
                )
            }
        }.toList()
    }
}
