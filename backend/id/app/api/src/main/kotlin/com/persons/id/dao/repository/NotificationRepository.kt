package com.persons.id.dao.repository

import com.persons.id.dao.entity.NotificationEntity
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

private const val ACCEPTED_FIELD = "accepted"
private const val ATTEMPTS_FIELD = "attempts"
private const val NEXT_ATTEMPT_AT_FIELD = "nextAttemptAt"
private const val EXPIRES_AT_FIELD = "expiresAt"
private const val MAX_DELIVERY_ATTEMPTS = 5

@Repository
class NotificationRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<NotificationEntity, UUID>(NotificationEntity::class.java, entityManager) {
    fun findDue(now: Instant, pageable: Pageable): List<NotificationEntity> {
        val builder = entityManager.criteriaBuilder
        val criteria = builder.createQuery(NotificationEntity::class.java)
        val row = criteria.from(NotificationEntity::class.java)

        criteria.select(row).where(
            builder.and(
                builder.isFalse(row.get<Boolean>(ACCEPTED_FIELD)),
                builder.lessThan(row.get<Int>(ATTEMPTS_FIELD), MAX_DELIVERY_ATTEMPTS),
                builder.lessThanOrEqualTo(row.get<Instant>(NEXT_ATTEMPT_AT_FIELD), now),
                builder.greaterThan(row.get<Instant>(EXPIRES_AT_FIELD), now),
            ),
        )
        criteria.orderBy(builder.asc(row.get<Instant>(NEXT_ATTEMPT_AT_FIELD)))

        val query = entityManager.createQuery(criteria)

        query.lockMode = LockModeType.PESSIMISTIC_WRITE
        query.maxResults = pageable.pageSize

        return query.resultList
    }

    @Transactional
    fun deleteExpiredBefore(before: Instant): Long = delete({ row, _, builder ->
        builder.lessThan(row.get<Instant>(EXPIRES_AT_FIELD), before)
    })
}
