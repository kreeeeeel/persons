package com.persons.restrictions.component

import com.persons.restrictions.domain.Restriction
import com.persons.restrictions.domain.RestrictionChange
import com.persons.restrictions.domain.RestrictionScope
import com.persons.restrictions.service.RestrictionStore
import org.springframework.data.domain.Page
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.util.UUID

private const val BLOCKED_BY_ADMINISTRATOR = "Аккаунт заблокирован администратором"

@Component
class RestrictionManagement(
    private val policy: AdministrativePolicy,
    private val restrictions: RestrictionComponent,
    private val store: RestrictionStore,
    private val clock: Clock,
) {
    @Transactional
    fun page(page: Int, size: Int, query: String, userId: UUID?): Page<Restriction> {
        policy.administrator()
        return store.page(page, size, query, userId)
    }

    @Transactional
    fun set(userId: UUID, change: RestrictionChange): Restriction =
        restrictions.set(userId, change, policy.administrator())

    @Transactional
    fun revoke(userId: UUID) {
        restrictions.revoke(userId, policy.administrator())
    }

    @Transactional
    fun blockAccount(userId: UUID) {
        val actor = policy.administrator()
        if (current(userId)?.scopes?.contains(RestrictionScope.ACCOUNT) != true) {
            restrictions.set(
                userId, RestrictionChange(setOf(RestrictionScope.ACCOUNT), BLOCKED_BY_ADMINISTRATOR, null), actor,
            )
        }
    }

    @Transactional
    fun unblockAccount(userId: UUID) {
        val actor = policy.administrator()
        if (current(userId)?.scopes?.contains(RestrictionScope.ACCOUNT) == true) restrictions.revoke(userId, actor)
    }

    private fun current(userId: UUID): Restriction? = store.find(listOf(userId)).firstOrNull()
        ?.takeIf { it.effective(clock.instant()) }
}
