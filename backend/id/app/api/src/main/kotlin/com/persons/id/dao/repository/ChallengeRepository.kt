package com.persons.id.dao.repository

import com.persons.id.dao.entity.ChallengeEntity
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

private const val ID_FIELD = "id"
private const val IP_FIELD = "ip"
private const val CREATED_AT_FIELD = "createdAt"
private const val EMAIL_FIELD = "email"
private const val EXPIRES_AT_FIELD = "expiresAt"

@Repository
class ChallengeRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<ChallengeEntity, UUID>(ChallengeEntity::class.java, entityManager) {
    fun findLocked(id: UUID): ChallengeEntity? {
        val builder = entityManager.criteriaBuilder
        val criteria = builder.createQuery(ChallengeEntity::class.java)
        val row = criteria.from(ChallengeEntity::class.java)

        criteria.select(row).where(builder.equal(row.get<UUID>(ID_FIELD), id))

        val query = entityManager.createQuery(criteria)

        query.lockMode = LockModeType.PESSIMISTIC_WRITE

        return query.resultList.firstOrNull()
    }

    fun countRecentByIp(ip: String, after: Instant): Long = count({ row, _, builder ->
        builder.and(
            builder.equal(row.get<String>(IP_FIELD), ip),
            builder.greaterThan(row.get<Instant>(CREATED_AT_FIELD), after),
        )
    })

    fun countRecentByEmail(email: String, after: Instant): Long = count({ row, _, builder ->
        builder.and(
            builder.equal(row.get<String>(EMAIL_FIELD), email),
            builder.greaterThan(row.get<Instant>(CREATED_AT_FIELD), after),
        )
    })

    @Transactional
    fun deleteExpiredBefore(before: Instant): Long = delete({ row, _, builder ->
        builder.lessThan(row.get<Instant>(EXPIRES_AT_FIELD), before)
    })
}
