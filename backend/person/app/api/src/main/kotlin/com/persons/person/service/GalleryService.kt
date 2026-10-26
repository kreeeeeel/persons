package com.persons.person.service

import com.persons.person.contract.dto.GalleryItem
import com.persons.person.contract.dto.GalleryPage
import com.persons.person.contract.dto.MediaDetail
import com.persons.person.contract.dto.MediaEditInput
import com.persons.person.contract.dto.MediaKind
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.MediaViewRepository
import com.persons.person.dao.repository.MomentRepository
import com.persons.person.dao.repository.PhotoRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.MediaEditReview
import com.persons.person.domain.MediaStatus
import com.persons.person.domain.PageRestrictionScope
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.NotFoundException
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.ZoneOffset
import java.util.UUID
import com.persons.person.domain.MediaKind as DomainMediaKind

private const val EDIT_MEDIA = "Изменение подписи и отметок на медиа"

@Service
class GalleryService(
    private val media: MediaService,
    private val tags: MediaTagService,
    private val reactions: MediaReactionService,
    private val comments: CommentRepository,
    private val access: PersonAccessService,
    private val queue: ModerationQueueService,
    private val photos: PhotoRepository,
    private val moments: MomentRepository,
    private val rows: MediaRepository,
    private val views: MediaViewRepository,
    private val authors: AuthorProfileService,
    private val pageRestrictions: PageRestrictionService,
) {
    @Transactional(readOnly = true)
    fun page(personId: UUID, page: Int, size: Int, actor: Actor?): GalleryPage {
        val person = access.visible(personId, actor)
        val result = rows.gallery(
            personId, null, actor,
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")),
        )
        val counts = views.counts(result.content.stream().map { it.id }.toList())
        return GalleryPage(
            items = result.content.stream().map { row ->
                val published = row.status == MediaStatus.PUBLISHED
                GalleryItem(
                    id = row.id,
                    mediaId = row.id,
                    kind = MediaKind.valueOf(row.kind.name),
                    title = row.caption,
                    createdAt = row.createdAt.atOffset(ZoneOffset.UTC),
                    canRemove = published && (actor?.id == row.uploaderId || access.canEdit(person, actor)),
                    views = counts[row.id] ?: 0,
                    durationSeconds = row.durationSeconds,
                    previewAvailable = row.previewObjectKey != null,
                    moderationStatus = if (published) ModerationStatus.APPROVED else ModerationStatus.PENDING,
                )
            }.toList(),
            total = result.totalElements,
            page = page,
            propertySize = size,
        )
    }

    @Transactional(readOnly = true)
    fun detail(id: UUID, actor: Actor?, mixed: Boolean = false): MediaDetail {
        val row = media.readable(id, actor)
        if (row.kind !in setOf(
                DomainMediaKind.PHOTO,
                DomainMediaKind.MOMENT,
            )
        ) {
            throw NotFoundException()
        }
        val published = row.status == MediaStatus.PUBLISHED
        val person = access.visible(row.personId, actor)
        val editable = published && actor != null && (row.uploaderId == actor.id || access.canEdit(person, actor))
        val author = authors.profiles(mapOf(row.uploaderId to row.uploaderName)).getValue(row.uploaderId)
        val previous = rows.adjacent(row, true, actor, mixed)
        val next = rows.adjacent(row, false, actor, mixed)
        return MediaDetail(
            id = row.id,
            personId = row.personId,
            kind = MediaKind.valueOf(row.kind.name),
            caption = row.caption,
            authorName = author.authorName,
            createdAt = row.createdAt.atOffset(ZoneOffset.UTC),
            taggedPersons = tags.summaries(id),
            reactions = reactions.states(listOf(id), actor).getValue(id),
            comments = comments.counts(listOf(id))[id] ?: 0,
            durationSeconds = row.durationSeconds,
            previewAvailable = row.previewObjectKey != null,
            canEdit = editable,
            canRemove = editable,
            authorTag = author.authorTag,
            authorAvatarMediaId = author.authorAvatarMediaId,
            authorAvatarUrl = author.authorAvatarUrl,
            views = views.total(id),
            previousMediaId = previous?.id,
            nextMediaId = next?.id,
            previousMediaKind = previous?.let { MediaKind.valueOf(it.kind.name) },
            nextMediaKind = next?.let { MediaKind.valueOf(it.kind.name) },
            moderationStatus = if (published) ModerationStatus.APPROVED else ModerationStatus.PENDING,
            canInteract = published,
        )
    }

    @Transactional
    fun proposeEdit(id: UUID, input: MediaEditInput, actor: Actor): ModerationReceipt {
        val row = media.interactive(id, actor)
        val person = access.locked(row.personId)
        pageRestrictions.ensure(row.personId, actor, PageRestrictionScope.MEDIA)
        if (row.uploaderId != actor.id && !access.canEdit(person, actor)) throw ForbiddenException()
        val ids = tags.validate(input.taggedPersonIds)
        return queue.submit(
            person,
            id,
            ChangeKind.UPDATE_MEDIA,
            actor,
            EDIT_MEDIA,
            MediaEditReview(input.caption.trim(), ids, tags.summariesFor(ids).stream().map { it.fullName }.toList()),
            previousPayload = mapOf(
                "caption" to row.caption,
                "taggedNames" to tags.summaries(id).stream().map { it.fullName }.toList(),
            ),
        )
    }

    fun applyEdit(id: UUID, input: MediaEditInput) {
        val row = media.interactive(id, null)
        row.caption = input.caption
        tags.replace(id, input.taggedPersonIds)
        photos.findById(id).ifPresent { it.title = input.caption }
        moments.findById(id).ifPresent { it.title = input.caption }
    }
}
