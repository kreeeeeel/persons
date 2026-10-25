package com.persons.person.dao.repository

import com.persons.person.dao.entity.MediaReactionEntity
import com.persons.person.dao.specification.matching
import com.persons.person.domain.ReactionKind
import jakarta.persistence.EntityManager
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID
import java.util.stream.Collectors

private const val COUNTS = """
    select r.mediaId, r.reaction, count(r) from MediaReactionEntity r
    where r.mediaId in :ids group by r.mediaId, r.reaction
"""
private const val MINE = "select r from MediaReactionEntity r where r.mediaId in :ids and r.userId = :user"

@Repository
class MediaReactionRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<MediaReactionEntity, UUID>(MediaReactionEntity::class.java, entityManager) {
    fun byUser(mediaId: UUID, userId: UUID): MediaReactionEntity? =
        findOne(matching("mediaId" to mediaId, "userId" to userId)).orElse(null)

    fun counts(ids: List<UUID>): Map<UUID, Map<ReactionKind, Long>> = if (ids.isEmpty()) {
        emptyMap()
    } else {
        entityManager.createQuery(COUNTS, Array<Any>::class.java).setParameter("ids", ids).resultList.stream()
            .collect(
                Collectors.groupingBy({
                    it[0] as UUID
                }, Collectors.toMap({ it[1] as ReactionKind }, { it[2] as Long })),
            )
    }

    fun mine(ids: List<UUID>, userId: UUID): Map<UUID, ReactionKind> = if (ids.isEmpty()) {
        emptyMap()
    } else {
        entityManager.createQuery(MINE, MediaReactionEntity::class.java).setParameter("ids", ids)
            .setParameter("user", userId).resultList.stream().collect(Collectors.toMap({ it.mediaId }, { it.reaction }))
    }
}
