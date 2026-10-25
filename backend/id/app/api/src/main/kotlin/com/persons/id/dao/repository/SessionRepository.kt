package com.persons.id.dao.repository

import com.persons.id.dao.entity.SessionEntity
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

private const val LAST_SEEN_AT_FIELD = "lastSeenAt"
private const val ID_FIELD = "id"
private const val REVOKED_FIELD = "revoked"
private const val USER_ID_FIELD = "userId"
private const val EXPIRES_AT_FIELD = "expiresAt"
private const val CREATED_AT_FIELD = "createdAt"

@Repository
class SessionRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<SessionEntity, UUID>(SessionEntity::class.java, entityManager) {
    fun lock(id: UUID): SessionEntity? =
        entityManager.find(SessionEntity::class.java, id, LockModeType.PESSIMISTIC_WRITE)

    @Transactional
    fun touch(id: UUID, now: Instant, threshold: Instant): Int {
        val builder = entityManager.criteriaBuilder
        val criteria = builder.createCriteriaUpdate(SessionEntity::class.java)
        val row = criteria.from(SessionEntity::class.java)

        criteria.set(row.get<Instant>(LAST_SEEN_AT_FIELD), now).where(
            builder.equal(row.get<UUID>(ID_FIELD), id),
            builder.isFalse(row.get<Boolean>(REVOKED_FIELD)),
            builder.lessThan(row.get<Instant>(LAST_SEEN_AT_FIELD), threshold),
        )

        return entityManager.createQuery(criteria).executeUpdate()
    }

    fun findActiveByUser(userId: UUID, now: Instant): List<SessionEntity> = findAll({ row, _, builder ->
        builder.and(
            builder.equal(row.get<UUID>(USER_ID_FIELD), userId),
            builder.isFalse(row.get<Boolean>(REVOKED_FIELD)),
            builder.greaterThan(row.get<Instant>(EXPIRES_AT_FIELD), now),
        )
    }, Sort.by(Sort.Direction.DESC, CREATED_AT_FIELD))

    @Transactional
    fun deleteExpiredBefore(before: Instant): Long = delete({ row, _, builder ->
        builder.lessThan(row.get<Instant>(EXPIRES_AT_FIELD), before)
    })
}
