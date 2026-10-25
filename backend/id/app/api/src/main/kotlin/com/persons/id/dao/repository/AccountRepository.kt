package com.persons.id.dao.repository

import com.persons.id.dao.entity.AccountEntity
import com.persons.id.domain.AccountRole
import com.persons.id.domain.AccountStatus
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

private const val EMAIL_FIELD = "email"
private const val ID_FIELD = "id"
private const val AVATAR_FIELD = "avatar"
private const val AVATAR_NEXT_ATTEMPT_AT_FIELD = "avatarNextAttemptAt"
private const val CREATED_AT_FIELD = "createdAt"

@Repository
class AccountRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<AccountEntity, UUID>(AccountEntity::class.java, entityManager) {
    fun lockAdministrators() {
        val builder = entityManager.criteriaBuilder
        val criteria = builder.createQuery(AccountEntity::class.java)
        val row = criteria.from(AccountEntity::class.java)

        criteria.select(row).where(builder.equal(row.get<AccountRole>("role"), AccountRole.ADMIN))
            .orderBy(builder.asc(row.get<UUID>(ID_FIELD)))
        entityManager.createQuery(criteria).setLockMode(LockModeType.PESSIMISTIC_WRITE).resultList
    }

    fun activeAdministrators(): Long = count { row, _, builder ->
        builder.and(
            builder.equal(row.get<AccountRole>("role"), AccountRole.ADMIN),
            builder.equal(row.get<AccountStatus>("status"), AccountStatus.ACTIVE),
        )
    }

    fun findByEmail(email: String): AccountEntity? = findOne({ row, _, builder ->
        builder.equal(row.get<String>(EMAIL_FIELD), email)
    }).orElse(null)

    fun findLockedByEmail(email: String): AccountEntity? {
        val builder = entityManager.criteriaBuilder
        val criteria = builder.createQuery(AccountEntity::class.java)
        val row = criteria.from(AccountEntity::class.java)

        criteria.select(row).where(builder.equal(row.get<String>(EMAIL_FIELD), email))

        val query = entityManager.createQuery(criteria)

        query.lockMode = LockModeType.PESSIMISTIC_WRITE

        return query.resultList.firstOrNull()
    }

    fun findLockedById(id: UUID): AccountEntity? {
        val builder = entityManager.criteriaBuilder
        val criteria = builder.createQuery(AccountEntity::class.java)
        val row = criteria.from(AccountEntity::class.java)

        criteria.select(row).where(builder.equal(row.get<UUID>(ID_FIELD), id))

        val query = entityManager.createQuery(criteria)

        query.lockMode = LockModeType.PESSIMISTIC_WRITE

        return query.resultList.firstOrNull()
    }

    fun findPendingAvatars(now: Instant, pageable: Pageable): List<AccountEntity> {
        val builder = entityManager.criteriaBuilder
        val criteria = builder.createQuery(AccountEntity::class.java)
        val row = criteria.from(AccountEntity::class.java)

        criteria.select(row).where(
            builder.and(
                builder.isNotNull(row.get<ByteArray>(AVATAR_FIELD)),
                builder.or(
                    builder.isNull(row.get<Instant>(AVATAR_NEXT_ATTEMPT_AT_FIELD)),
                    builder.lessThanOrEqualTo(row.get<Instant>(AVATAR_NEXT_ATTEMPT_AT_FIELD), now),
                ),
            ),
        )
        criteria.orderBy(builder.asc(row.get<Instant>(CREATED_AT_FIELD)))

        val query = entityManager.createQuery(criteria)

        query.maxResults = pageable.pageSize

        return query.resultList
    }
}
