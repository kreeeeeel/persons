package com.persons.person.dao.repository

import com.persons.person.dao.entity.ContentLikeEntity
import com.persons.person.dao.specification.matching
import com.persons.person.domain.ContentKind
import com.persons.person.domain.ReactionKind
import jakarta.persistence.EntityManager
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID
import java.util.stream.Collectors

private const val COUNTS_QUERY = """
    select l.targetId, count(l) from ContentLikeEntity l
    where l.targetKind = :kind and l.targetId in :ids and l.reaction = :reaction group by l.targetId
"""
private const val MINE_QUERY = """
    select l.targetId, l.reaction from ContentLikeEntity l
    where l.targetKind = :kind and l.targetId in :ids and l.userId = :user
"""
private const val CLEAR_QUERY = "delete from ContentLikeEntity l where l.targetKind = :kind and l.targetId = :id"

@Repository
class ContentLikeRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<ContentLikeEntity, UUID>(ContentLikeEntity::class.java, entityManager) {
    fun byUser(kind: ContentKind, target: UUID, user: UUID): ContentLikeEntity? =
        findOne(matching("targetKind" to kind, "targetId" to target, "userId" to user)).orElse(null)

    fun counts(kind: ContentKind, ids: List<UUID>, reaction: ReactionKind): Map<UUID, Long> = if (ids.isEmpty()) {
        emptyMap()
    } else {
        entityManager.createQuery(COUNTS_QUERY, Array<Any>::class.java).setParameter("kind", kind)
            .setParameter("ids", ids).setParameter("reaction", reaction).resultList.stream()
            .collect(Collectors.toMap({ it[0] as UUID }, { it[1] as Long }))
    }

    fun mine(kind: ContentKind, ids: List<UUID>, user: UUID?): Map<UUID, ReactionKind> = if (ids.isEmpty() ||
        user == null
    ) {
        emptyMap()
    } else {
        entityManager.createQuery(MINE_QUERY, Array<Any>::class.java).setParameter("kind", kind)
            .setParameter("ids", ids).setParameter("user", user).resultList.stream()
            .collect(Collectors.toMap({ it[0] as UUID }, { it[1] as ReactionKind }))
    }

    fun clearTarget(kind: ContentKind, id: UUID) {
        entityManager.createQuery(CLEAR_QUERY).setParameter("kind", kind).setParameter("id", id).executeUpdate()
    }
}
