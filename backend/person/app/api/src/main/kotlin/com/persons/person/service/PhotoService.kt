package com.persons.person.service

import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.contract.dto.Photo
import com.persons.person.contract.dto.PhotoPage
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.MediaViewRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.ZoneOffset
import java.util.UUID

private const val CREATED_AT = "createdAt"

@Service
class PhotoService(
    private val media: MediaRepository,
    private val access: PersonAccessService,
    private val views: MediaViewRepository,
) {
    @Transactional(readOnly = true)
    fun page(personId: UUID, page: Int, size: Int, actor: Actor?): PhotoPage {
        val person = access.visible(personId, actor)
        val rows = media.gallery(
            personId,
            MediaKind.PHOTO,
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
        val counts = views.counts(rows.content.stream().map { it.id }.toList())

        return PhotoPage(
            rows.content.stream().map {
                val published = it.status == MediaStatus.PUBLISHED
                Photo(
                    id = it.id,
                    mediaId = it.id,
                    title = it.caption,
                    createdAt = it.createdAt.atOffset(ZoneOffset.UTC),
                    canRemove = published && (actor?.id == it.uploaderId || access.canEdit(person, actor)),
                    views = counts[it.id] ?: 0,
                    moderationStatus = if (published) ModerationStatus.APPROVED else ModerationStatus.PENDING,
                )
            }.toList(),
            rows.totalElements, page, size,
        )
    }
}
