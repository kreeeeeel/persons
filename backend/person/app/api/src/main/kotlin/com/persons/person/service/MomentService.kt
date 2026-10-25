package com.persons.person.service

import com.persons.person.contract.dto.LikeState
import com.persons.person.contract.dto.MediaReaction
import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.contract.dto.Moment
import com.persons.person.contract.dto.MomentPage
import com.persons.person.dao.entity.MomentEntity
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.MediaViewRepository
import com.persons.person.dao.repository.MomentRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ErrorCode
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import com.persons.person.domain.ReactionKind
import com.persons.person.exception.impl.NotFoundException
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.ZoneOffset
import java.util.UUID

private const val CREATED_AT = "createdAt"

@Service
class MomentService(
    private val moments: MomentRepository,
    private val reactions: MediaReactionService,
    private val media: MediaRepository,
    private val comments: CommentRepository,
    private val access: PersonAccessService,
    private val views: MediaViewRepository,
    private val authors: AuthorProfileService,
) {
    @Transactional(readOnly = true)
    fun page(personId: UUID, page: Int, size: Int, actor: Actor?): MomentPage {
        val person = access.visible(personId, actor)
        val rows = media.gallery(
            personId,
            MediaKind.MOMENT,
            actor,
            PageRequest.of(
                page,
                size,
                Sort.by(
                    Sort.Direction.DESC,
                    CREATED_AT,
                    "id",
                ),
            ),
        )
        val ids = rows.content.stream().map { it.id }.toList()
        val votes = reactions.states(ids, actor)
        val commentCounts = comments.counts(ids)
        val viewCounts = views.counts(ids)
        val profiles = authors.profiles(
            rows.content.stream().collect(
                java.util.stream.Collectors.toMap({ it.uploaderId }, { it.uploaderName }, { first, _ -> first }),
            ),
        )

        return MomentPage(
            rows.content.stream().map {
                val published = it.status == MediaStatus.PUBLISHED
                Moment(
                    id = it.id,
                    mediaId = it.id,
                    title = it.caption,
                    authorName = profiles.getValue(it.uploaderId).authorName,
                    createdAt = it.createdAt.atOffset(ZoneOffset.UTC),
                    likes = votes[it.id]?.likes ?: 0,
                    liked = votes[it.id]?.reaction == MediaReaction.LIKE,
                    comments = commentCounts[it.id] ?: 0,
                    canRemove = published && (actor?.id == it.uploaderId || access.canEdit(person, actor)),
                    durationSeconds = it.durationSeconds,
                    previewAvailable = it.previewObjectKey != null,
                    views = viewCounts[it.id] ?: 0,
                    moderationStatus = if (published) ModerationStatus.APPROVED else ModerationStatus.PENDING,
                )
            }.toList(),
            rows.totalElements, page, size,
        )
    }

    @Transactional
    fun react(id: UUID, liked: Boolean, actor: Actor): LikeState {
        val personId = moments.personId(id) ?: throw NotFoundException(ErrorCode.CONTENT_NOT_FOUND)
        access.locked(personId)
        access.visible(personId, actor)
        live(id)
        val result = reactions.react(id, if (liked) ReactionKind.LIKE else null, actor)
        return LikeState(result.likes, result.reaction == MediaReaction.LIKE)
    }

    fun live(id: UUID): MomentEntity {
        val row = moments.findById(id).orElseThrow { NotFoundException(ErrorCode.CONTENT_NOT_FOUND) }

        if (row.deleted) {
            throw NotFoundException(ErrorCode.CONTENT_NOT_FOUND)
        }

        return row
    }
}
