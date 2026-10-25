package com.persons.restrictions.component

import com.persons.restrictions.domain.Administrator
import com.persons.restrictions.domain.Restriction
import com.persons.restrictions.domain.RestrictionChange
import com.persons.restrictions.exception.impl.InvalidInputException
import com.persons.restrictions.service.RestrictionStore
import org.springframework.stereotype.Component
import java.time.Clock
import java.util.UUID

private const val MIN_REASON_LENGTH = 3
private const val MAX_REASON_LENGTH = 1000
private const val LOOKUP_LIMIT = 100

@Component
class RestrictionComponent(
    private val store: RestrictionStore,
    private val cache: RestrictionCache,
    private val clock: Clock,
) {
    fun current(userId: UUID): Restriction? {
        // The indexed revision read prevents a cached policy surviving an edit or revocation.
        val revision = store.revision(userId)
        if (revision == null) return null
        val row = cache.get(userId, revision) ?: store.find(listOf(userId)).firstOrNull()?.also { cache.put(it) }
        return row?.takeIf { it.effective(clock.instant()) }
    }

    fun lookup(userIds: Collection<UUID>): List<Restriction> {
        if (userIds.isEmpty() || userIds.size > LOOKUP_LIMIT || userIds.toSet().size != userIds.size) {
            throw InvalidInputException()
        }
        return store.find(userIds).stream().filter { it.effective(clock.instant()) }.toList()
    }

    fun set(userId: UUID, change: RestrictionChange, administrator: Administrator): Restriction {
        if (change.scopes.isEmpty() ||
            change.reason.trim().length !in MIN_REASON_LENGTH..MAX_REASON_LENGTH ||
            change.expiresAt?.isAfter(clock.instant()) == false
        ) {
            throw InvalidInputException()
        }
        // Mutations can join an outer management transaction. Populate cache only from committed reads.
        return store.set(userId, change, administrator)
    }

    fun revoke(userId: UUID, administrator: Administrator) {
        store.revoke(userId, administrator)
    }

    fun expire(): Int = store.expire()
}
