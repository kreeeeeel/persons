package com.persons.restrictions.service.impl

import com.persons.restrictions.dao.entity.AccountRestrictionEntity
import com.persons.restrictions.dao.entity.PolicyLockEntity
import com.persons.restrictions.dao.repository.AccountRestrictionRepository
import com.persons.restrictions.domain.Administrator
import com.persons.restrictions.domain.Restriction
import com.persons.restrictions.domain.RestrictionChange
import com.persons.restrictions.domain.RestrictionScope
import com.persons.restrictions.exception.impl.ForbiddenException
import com.persons.restrictions.exception.impl.UnavailableException
import com.persons.restrictions.service.RestrictionStore
import com.persons.restrictions.transformer.toDomain
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.util.UUID

private const val EXPIRY_BATCH_SIZE = 500
private const val POLICY_LOCK_ID: Short = 1

@Service
class RestrictionStoreImpl(
    private val restrictions: AccountRestrictionRepository,
    private val entityManager: EntityManager,
    private val clock: Clock,
) : RestrictionStore {
    @Transactional(readOnly = true)
    override fun page(page: Int, size: Int, query: String, userId: UUID?): Page<Restriction> {
        val text = "%${query.trim().lowercase().replace("!", "!!").replace("%", "!%")
            .replace("_", "!_")}%"
        return restrictions.active(
            clock.instant(), text, userId,
            PageRequest.of(
                page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"),
            ),
        ).map { it.toDomain() }
    }

    @Transactional(propagation = Propagation.MANDATORY)
    override fun lockManagement() {
        // Policy edits and administrator authorization share the same lock until commit.
        if (entityManager.find(PolicyLockEntity::class.java, POLICY_LOCK_ID, LockModeType.PESSIMISTIC_WRITE) == null) {
            throw UnavailableException()
        }
    }

    @Transactional(readOnly = true)
    override fun revision(userId: UUID): Long? = restrictions.revision(userId)

    @Transactional(readOnly = true)
    override fun find(userIds: Collection<UUID>): List<Restriction> = if (userIds.isEmpty()) {
        emptyList()
    } else {
        restrictions.forUsers(userIds).stream().map { it.toDomain() }.toList()
    }

    @Transactional
    override fun set(userId: UUID, change: RestrictionChange, administrator: Administrator): Restriction {
        lock(administrator)
        if (userId == administrator.id && RestrictionScope.ACCOUNT in change.scopes) throw ForbiddenException()
        val row = restrictions.forUsers(listOf(userId)).firstOrNull() ?: AccountRestrictionEntity(userId = userId)
        row.reason = change.reason.trim()
        row.createdBy = administrator.id
        row.createdAt = clock.instant()
        row.expiresAt = change.expiresAt
        row.revoked = false
        row.scopes.clear()
        row.scopes.addAll(change.scopes)
        return restrictions.saveAndFlush(row).toDomain()
    }

    @Transactional
    override fun revoke(userId: UUID, administrator: Administrator) {
        lock(administrator)
        val row = restrictions.forUsers(listOf(userId)).firstOrNull()
        if (row != null) {
            row.revoked = true
            restrictions.saveAndFlush(row)
        }
    }

    @Transactional
    override fun expire(): Int {
        lockManagement()
        val rows = restrictions.expired(clock.instant(), PageRequest.of(0, EXPIRY_BATCH_SIZE))
        rows.stream().forEach { it.revoked = true }
        restrictions.saveAllAndFlush(rows)
        return rows.size
    }

    private fun lock(administrator: Administrator) {
        lockManagement()
        val current = restrictions.forUsers(listOf(administrator.id)).firstOrNull()?.toDomain()
        if (current?.effective(clock.instant()) == true && RestrictionScope.ACCOUNT in current.scopes) {
            throw ForbiddenException()
        }
    }
}
