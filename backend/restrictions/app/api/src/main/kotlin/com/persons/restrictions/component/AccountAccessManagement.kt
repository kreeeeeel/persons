package com.persons.restrictions.component

import com.persons.restrictions.domain.AccountAccessChange
import com.persons.restrictions.domain.AccountStatus
import com.persons.restrictions.domain.ManagedAccount
import com.persons.restrictions.domain.RestrictionScope
import com.persons.restrictions.service.RestrictionStore
import org.springframework.stereotype.Component
import java.time.Clock
import java.util.UUID

@Component
class AccountAccessManagement(
    private val restrictions: RestrictionManagement,
    private val accounts: AccountRoleManagement,
    private val store: RestrictionStore,
    private val clock: Clock,
) {
    fun update(userId: UUID, change: AccountAccessChange): ManagedAccount {
        // Commit restrictive changes before the remote role update. Unblock only after it succeeds.
        if (change.status == AccountStatus.BLOCKED) restrictions.blockAccount(userId)
        val account = accounts.updateRole(userId, change.role)
        if (change.status == AccountStatus.ACTIVE) restrictions.unblockAccount(userId)
        val current = store.find(listOf(userId)).firstOrNull()?.takeIf { it.effective(clock.instant()) }
        val status = if (current?.scopes?.contains(RestrictionScope.ACCOUNT) ==
            true
        ) {
            AccountStatus.BLOCKED
        } else {
            account.status
        }
        return account.copy(status = status, restriction = current)
    }
}
