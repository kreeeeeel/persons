package com.persons.person.dao.repository

import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.specification.matching
import com.persons.person.domain.Actor
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import jakarta.persistence.EntityManager
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

private const val GALLERY_VISIBILITY = """
    (m.status = com.persons.person.domain.MediaStatus.PUBLISHED or
    (m.status = com.persons.person.domain.MediaStatus.PENDING and (:admin = true or m.uploaderId = :viewer)))
"""

@Repository
class MediaRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<MediaEntity, UUID>(MediaEntity::class.java, entityManager) {
    fun gallery(personId: UUID, kind: MediaKind, actor: Actor?, pageable: Pageable): Page<MediaEntity> = findAll(
        matching<MediaEntity>("personId" to personId, "kind" to kind).and(
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
        ),
        pageable,
    )

    fun adjacent(row: MediaEntity, newer: Boolean, actor: Actor? = null): UUID? {
        val comparison = if (newer) ">" else "<"
        val direction = if (newer) "asc" else "desc"
        return entityManager.createQuery(
            "select m.id from MediaEntity m where m.personId = :person and m.kind = :kind " +
                "and m.id <> :id and " + GALLERY_VISIBILITY + " and " +
                "(m.createdAt $comparison :date or (m.createdAt = :date and m.id $comparison :id)) " +
                "order by m.createdAt $direction, m.id $direction",
            UUID::class.java,
        ).setParameter("admin", actor?.administrator == true).setParameter("viewer", actor?.id)
            .setParameter("person", row.personId).setParameter("kind", row.kind)
            .setParameter("date", row.createdAt).setParameter("id", row.id).setMaxResults(1).resultList.firstOrNull()
    }
}
