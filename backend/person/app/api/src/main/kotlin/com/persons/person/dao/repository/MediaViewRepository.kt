package com.persons.person.dao.repository

import com.persons.person.dao.entity.MediaViewEntity
import com.persons.person.dao.specification.matching
import jakarta.persistence.EntityManager
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.time.LocalDate
import java.util.UUID
import java.util.stream.Collectors

private const val COUNTS_QUERY = """
    select v.mediaId, count(v) from MediaViewEntity v where v.mediaId in :ids group by v.mediaId
"""

@Repository
class MediaViewRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<MediaViewEntity, UUID>(MediaViewEntity::class.java, entityManager) {
    fun seen(mediaId: UUID, hash: String, date: LocalDate): Boolean =
        exists(matching("mediaId" to mediaId, "visitorHash" to hash, "viewDate" to date))

    fun total(mediaId: UUID): Long = count(matching("mediaId" to mediaId))

    fun counts(ids: List<UUID>): Map<UUID, Long> = if (ids.isEmpty()) {
        emptyMap()
    } else {
        entityManager.createQuery(COUNTS_QUERY, Array<Any>::class.java).setParameter("ids", ids).resultList.stream()
            .collect(Collectors.toMap({ it[0] as UUID }, { it[1] as Long }))
    }
}
