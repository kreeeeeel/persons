package com.persons.person.service

import com.persons.person.component.MediaObjectKeys
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.MomentEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.PhotoEntity
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.MomentRepository
import com.persons.person.dao.repository.PhotoRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.ErrorCode
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaReview
import com.persons.person.domain.MediaStatus
import com.persons.person.domain.PageRestrictionScope
import com.persons.person.domain.VerifiedUpload
import com.persons.person.exception.impl.ConflictException
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.InvalidInputException
import com.persons.person.exception.impl.NotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.util.UUID

private const val MAX_CAPTION_LENGTH = 200
private const val ADD_MEDIA = "Новый медиафайл"
private const val REMOVE_MEDIA = "Удаление медиафайла"
private const val MAX_DURATION_SECONDS = 86400.0

@Service
class MediaService(
    private val media: MediaRepository,
    private val moments: MomentRepository,
    private val photos: PhotoRepository,
    private val access: PersonAccessService,
    private val queue: ModerationQueueService,
    private val clock: Clock,
    private val objectKeys: MediaObjectKeys,
    private val tags: MediaTagService,
    private val qualities: MediaQualityDao,
    private val pageRestrictions: PageRestrictionService,
) {
    @Transactional
    fun reserve(
        personId: UUID,
        kind: MediaKind,
        caption: String,
        upload: VerifiedUpload,
        actor: Actor,
        duration: Double = 0.0,
        preview: VerifiedUpload? = null,
    ): MediaEntity {
        val person = access.locked(personId)
        access.visible(personId, actor)
        pageRestrictions.ensure(personId, actor, PageRestrictionScope.MEDIA)

        if (kind == MediaKind.AVATAR) {
            access.requireEditor(person, actor)
        }
        if (caption.length > MAX_CAPTION_LENGTH) {
            throw InvalidInputException()
        }
        if (!duration.isFinite() ||
            duration < 0 ||
            duration > MAX_DURATION_SECONDS ||
            (kind != MediaKind.MOMENT && (duration != 0.0 || preview != null))
        ) {
            throw InvalidInputException()
        }

        val id = UUID.randomUUID()
        val objectKey = objectKeys.media(kind, person.id, id)

        return media.save(
            MediaEntity(
                id = id, personId = person.id, uploaderId = actor.id, uploaderName = actor.name,
                kind = kind, caption = caption.trim(), objectKey = objectKey,
                contentType = upload.contentType, sizeBytes = upload.size, createdAt = clock.instant(),
                durationSeconds = duration,
                previewObjectKey = preview?.let { objectKeys.preview(person.id, id) },
                previewContentType = preview?.contentType,
                previewSize = preview?.size,
            ),
        )
    }

    @Transactional
    fun complete(id: UUID, actor: Actor, taggedIds: List<UUID> = emptyList()): ModerationReceipt {
        val row = media.findById(id).orElseThrow { NotFoundException(ErrorCode.CONTENT_NOT_FOUND) }
        val person = access.locked(row.personId)

        if (row.status != MediaStatus.STAGED || row.uploaderId != actor.id) {
            throw ConflictException()
        }

        row.status = MediaStatus.PENDING
        if (row.kind == MediaKind.MOMENT) {
            media.flush()
            qualities.enqueue(id, clock.instant())
        }
        tags.replace(id, taggedIds)

        return queue.submit(
            person, id, ChangeKind.PUBLISH_MEDIA, actor, row.caption.ifBlank { ADD_MEDIA },
            MediaReview(
                row.id, row.kind, row.caption, row.contentType, taggedIds,
                tags.summariesFor(taggedIds).stream().map { it.fullName }.toList(),
            ),
        )
    }

    @Transactional(readOnly = true)
    fun readable(id: UUID, actor: Actor?): MediaEntity {
        val row = media.findById(id).orElseThrow { NotFoundException(ErrorCode.CONTENT_NOT_FOUND) }
        if (actor?.administrator == true &&
            row.status != MediaStatus.PURGED &&
            row.status != MediaStatus.STAGED
        ) {
            return row
        }
        if (row.status == MediaStatus.DELETED || row.status == MediaStatus.PURGED) {
            throw NotFoundException(ErrorCode.CONTENT_NOT_FOUND)
        }
        val person = access.visible(row.personId, actor)

        if (row.kind == MediaKind.PROOF) {
            if (actor == null || (!actor.administrator && row.uploaderId != actor.id)) {
                throw NotFoundException(ErrorCode.CONTENT_NOT_FOUND)
            }
            return row
        }
        if (row.status == MediaStatus.PUBLISHED && person.published) {
            return row
        }
        if (row.status != MediaStatus.PENDING ||
            actor == null ||
            (!actor.administrator && row.uploaderId != actor.id)
        ) {
            throw NotFoundException(ErrorCode.CONTENT_NOT_FOUND)
        }

        return row
    }

    fun interactive(id: UUID, actor: Actor?): MediaEntity {
        val row = readable(id, actor)
        if (row.status != MediaStatus.PUBLISHED || row.kind !in setOf(MediaKind.PHOTO, MediaKind.MOMENT)) {
            throw NotFoundException(ErrorCode.CONTENT_NOT_FOUND)
        }
        return row
    }

    fun pendingProof(id: UUID, actorId: UUID, personId: UUID): MediaEntity {
        val row = live(id)
        if (row.kind != MediaKind.PROOF ||
            row.uploaderId != actorId ||
            row.personId != personId ||
            row.status != MediaStatus.STAGED
        ) {
            throw ConflictException()
        }
        row.status = MediaStatus.PENDING
        return row
    }

    fun proof(id: UUID, actorId: UUID, personId: UUID): MediaEntity {
        val row = live(id)
        if (row.kind != MediaKind.PROOF ||
            row.uploaderId != actorId ||
            row.personId != personId ||
            row.status != MediaStatus.PENDING
        ) {
            throw ConflictException()
        }
        return row
    }

    @Transactional
    fun proposeRemoval(id: UUID, actor: Actor, reason: String? = null): ModerationReceipt {
        val row = live(id)
        val person = access.visible(row.personId, actor)

        if (row.uploaderId != actor.id && !access.canEdit(person, actor)) {
            throw ForbiddenException()
        }

        return queue.submit(
            person, id, ChangeKind.DELETE_MEDIA, actor, REMOVE_MEDIA,
            MediaReview(row.id, row.kind, row.caption, row.contentType),
            reason = reason,
        )
    }

    fun publish(id: UUID, person: PersonEntity) {
        val row = live(id)

        if (row.status != MediaStatus.PENDING || row.personId != person.id) {
            throw ConflictException()
        }

        when (row.kind) {
            MediaKind.PROOF -> throw InvalidInputException()
            MediaKind.AVATAR -> {
                person.avatarMediaId?.let { previous ->
                    media.findById(previous).ifPresent {
                        it.status =
                            MediaStatus.DELETED
                        it.deletedAt = clock.instant()
                    }
                }
                person.avatarMediaId = row.id
            }
            MediaKind.PHOTO -> photos.save(
                PhotoEntity(
                    id = row.id, personId = person.id, mediaId = row.id,
                    authorId = row.uploaderId, title = row.caption, createdAt = clock.instant(),
                ),
            )
            MediaKind.MOMENT -> moments.save(
                MomentEntity(
                    id = row.id, personId = person.id, mediaId = row.id,
                    title = row.caption, authorId = row.uploaderId,
                    authorName = row.uploaderName, createdAt = clock.instant(),
                ),
            )
        }

        row.status = MediaStatus.PUBLISHED
    }

    fun remove(id: UUID, person: PersonEntity): UUID {
        val row = live(id)
        row.status = MediaStatus.DELETED
        row.deletedAt = clock.instant()
        moments.findById(id).ifPresent { it.deleted = true }
        photos.findById(id).ifPresent { it.deleted = true }

        if (person.avatarMediaId == id) {
            person.avatarMediaId = null
        }

        return row.uploaderId
    }

    fun reject(id: UUID) {
        media.findById(id).ifPresent {
            if (it.status != MediaStatus.DELETED && it.status != MediaStatus.PURGED) {
                it.status = MediaStatus.DELETED
                it.deletedAt = clock.instant()
            }
        }
    }

    private fun live(id: UUID): MediaEntity {
        val row = media.findById(id).orElseThrow { NotFoundException(ErrorCode.CONTENT_NOT_FOUND) }

        if (row.status == MediaStatus.DELETED || row.status == MediaStatus.PURGED) {
            throw NotFoundException(ErrorCode.CONTENT_NOT_FOUND)
        }

        return row
    }
}
