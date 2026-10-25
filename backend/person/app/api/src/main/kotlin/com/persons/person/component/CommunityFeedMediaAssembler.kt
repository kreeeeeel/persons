package com.persons.person.component

import com.persons.person.contract.dto.CommunityFeedEvent
import com.persons.person.contract.dto.CommunityFeedKind
import com.persons.person.contract.dto.MediaReaction
import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.contract.dto.Moment
import com.persons.person.contract.dto.Photo
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.MediaViewRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.FeedEntry
import com.persons.person.service.AuthorProfileService
import com.persons.person.service.MediaReactionService
import com.persons.person.service.PersonAccessService
import com.persons.person.transformer.toSummary
import org.springframework.stereotype.Component
import java.time.ZoneOffset
import java.util.UUID
import java.util.stream.Collectors

@Component
class CommunityFeedMediaAssembler(
    private val media: MediaRepository,
    private val views: MediaViewRepository,
    private val comments: CommentRepository,
    private val reactions: MediaReactionService,
    private val authors: AuthorProfileService,
    private val access: PersonAccessService,
) {
    fun assemble(entries: List<FeedEntry>, pages: Map<UUID, PersonEntity>, actor: Actor?): List<CommunityFeedEvent> {
        val selected = entries.stream().filter {
            it.kind == CommunityFeedKind.PHOTO ||
                it.kind == CommunityFeedKind.MOMENT
        }
            .collect(Collectors.toMap({ UUID.fromString(it.sourceId) }, { it }))
        if (selected.isEmpty()) return emptyList()
        val ids = selected.keys.toList()
        val rows = media.findAllById(ids)
        val counts = views.counts(ids)
        val commentCounts = comments.counts(ids)
        val votes = reactions.states(ids, actor)
        val profiles = authors.profiles(
            rows.stream().collect(
                Collectors.toMap({
                    it.uploaderId
                }, { it.uploaderName }, { first, _ -> first }),
            ),
        )
        return rows.stream().map { row ->
            val entry = selected.getValue(row.id)
            val page = pages.getValue(row.personId)
            val date = row.createdAt.atOffset(ZoneOffset.UTC)
            val canRemove = actor?.id == row.uploaderId || access.canEdit(page, actor)
            val event = entry.event(page.toSummary())
            if (entry.kind == CommunityFeedKind.PHOTO) {
                event.copy(
                    photo = Photo(
                        id = row.id, mediaId = row.id, title = row.caption, createdAt = date, canRemove = canRemove,
                        views = counts[row.id] ?: 0,
                        moderationStatus = ModerationStatus.APPROVED,
                    ),
                )
            } else {
                val vote = votes[row.id]
                event.copy(
                    moment = Moment(
                        id = row.id, mediaId = row.id, title = row.caption,
                        authorName = profiles.getValue(row.uploaderId).authorName,
                        createdAt = date, likes = vote?.likes ?: 0, liked = vote?.reaction == MediaReaction.LIKE,
                        comments = commentCounts[row.id] ?: 0, canRemove = canRemove,
                        durationSeconds = row.durationSeconds,
                        previewAvailable = row.previewObjectKey != null, views = counts[row.id] ?: 0,
                        moderationStatus = ModerationStatus.APPROVED,
                    ),
                )
            }
        }.toList()
    }
}
