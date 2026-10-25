package com.persons.restrictions.component

import com.persons.restrictions.domain.AccountRole
import com.persons.restrictions.domain.ManagedAccount
import com.persons.restrictions.exception.impl.ForbiddenException
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Component
class AccountRoleManagement(private val policy: AdministrativePolicy, private val accounts: AccountAdministration) {
    @Transactional
    fun updateRole(userId: UUID, role: AccountRole): ManagedAccount {
        val actor = policy.administrator()
        if (actor.id == userId && role != AccountRole.ADMIN) throw ForbiddenException()
        return accounts.updateRole(userId, role)
    }
}
