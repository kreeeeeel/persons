package com.persons.id.dao.repository

import com.persons.id.dao.entity.LoginAttemptEntity
import jakarta.persistence.EntityManager
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

private const val IP_FIELD = "ip"
private const val CREATED_AT_FIELD = "createdAt"

@Repository
class LoginAttemptRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<LoginAttemptEntity, UUID>(LoginAttemptEntity::class.java, entityManager) {
    fun countRecentByIp(ip: String, after: Instant): Long = count({ row, _, builder ->
        builder.and(
            builder.equal(row.get<String>(IP_FIELD), ip),
            builder.greaterThan(row.get<Instant>(CREATED_AT_FIELD), after),
        )
    })

    @Transactional
    fun deleteCreatedBefore(before: Instant): Long = delete({ row, _, builder ->
        builder.lessThan(row.get<Instant>(CREATED_AT_FIELD), before)
    })
}
