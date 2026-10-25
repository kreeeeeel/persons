package com.persons.mail.dao.repository

import com.persons.mail.dao.entity.MailEntity
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

private const val STATUS_FIELD = "status"
private const val NEXT_ATTEMPT_AT_FIELD = "nextAttemptAt"
private const val QUEUED_STATUS = "QUEUED"
private const val CREATED_AT_FIELD = "createdAt"

@Repository
class MailRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<MailEntity, UUID>(MailEntity::class.java, entityManager) {
    fun findDue(now: Instant, pageable: Pageable): List<MailEntity> {
        val builder = entityManager.criteriaBuilder
        val criteria = builder.createQuery(MailEntity::class.java)
        val row = criteria.from(MailEntity::class.java)

        criteria.select(row).where(
            builder.and(
                builder.equal(row.get<String>(STATUS_FIELD), QUEUED_STATUS),
                builder.lessThanOrEqualTo(row.get<Instant>(NEXT_ATTEMPT_AT_FIELD), now),
            ),
        )
        criteria.orderBy(builder.asc(row.get<Instant>(CREATED_AT_FIELD)))

        val query = entityManager.createQuery(criteria)

        query.lockMode = LockModeType.PESSIMISTIC_WRITE
        query.maxResults = pageable.pageSize

        return query.resultList
    }
}
