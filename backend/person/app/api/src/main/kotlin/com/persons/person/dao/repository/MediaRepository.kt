package com.persons.person.dao.repository

import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.specification.matching
import com.persons.person.domain.Actor
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import jakarta.persistence.EntityManager
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

@Repository
class MediaRepository(entityManager: EntityManager) :
    SimpleJpaRepository<MediaEntity, UUID>(MediaEntity::class.java, entityManager) {
    fun gallery(personId: UUID, kind: MediaKind?, actor: Actor?, pageable: Pageable): Page<MediaEntity> = findAll(
        galleryVisibility(personId, kind, actor),
        pageable,
    )

    private fun galleryVisibility(personId: UUID, kind: MediaKind?, actor: Actor?): Specification<MediaEntity> =
        matching<MediaEntity>("personId" to personId).and(
            Specification { row, _, _ ->
                row.get<MediaKind>("kind").`in`(kind?.let(::listOf) ?: listOf(MediaKind.PHOTO, MediaKind.MOMENT))
            },
        ).and(
            Specification { row, _, builder ->
                val published = builder.equal(
                    row.get<MediaStatus>("status"),
                    MediaStatus.PUBLISHED,
                )
                if (actor == null) {
                    published
                } else {
                    val pending = builder.equal(
                        row.get<MediaStatus>("status"),
                        MediaStatus.PENDING,
                    )
                    val mine = if (actor.administrator) {
                        builder.conjunction()
                    } else {
                        builder.equal(
                            row.get<UUID>("uploaderId"),
                            actor.id,
                        )
                    }
                    builder.or(published, builder.and(pending, mine))
                }
            },
        )

    fun adjacent(row: MediaEntity, newer: Boolean, actor: Actor? = null, mixed: Boolean = false): MediaEntity? {
        val neighbor = Specification<MediaEntity> { candidate, _, builder ->
            val date = candidate.get<Instant>("createdAt")
            val id = candidate.get<UUID>("id")
            val byDate = if (newer) builder.greaterThan(date, row.createdAt) else builder.lessThan(date, row.createdAt)
            val byId = if (newer) builder.greaterThan(id, row.id) else builder.lessThan(id, row.id)
            builder.and(
                builder.notEqual(id, row.id),
                builder.or(byDate, builder.and(builder.equal(date, row.createdAt), byId)),
            )
        }
        val direction = if (newer) Sort.Direction.ASC else Sort.Direction.DESC
        return findAll(
            galleryVisibility(row.personId, if (mixed) null else row.kind, actor).and(neighbor),
            PageRequest.of(0, 1, Sort.by(direction, "createdAt", "id")),
        ).content.firstOrNull()
    }
}
