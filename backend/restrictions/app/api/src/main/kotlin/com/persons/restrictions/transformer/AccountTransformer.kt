package com.persons.restrictions.transformer

import com.persons.restrictions.contract.dto.AdminUser
import com.persons.restrictions.contract.dto.UpdateAccess
import com.persons.restrictions.domain.AccountAccessChange
import com.persons.restrictions.domain.AccountRole
import com.persons.restrictions.domain.AccountStatus
import com.persons.restrictions.domain.ManagedAccount
import java.time.ZoneOffset

fun com.persons.id.client.generated.model.AdminUser.toDomain(): ManagedAccount = ManagedAccount(
    id, email, firstName, lastName, AccountRole.valueOf(role.value), AccountStatus.valueOf(status.value),
    createdAt.toInstant(),
)

fun UpdateAccess.toDomain(): AccountAccessChange = AccountAccessChange(
    AccountRole.valueOf(role.value), AccountStatus.valueOf(status.value),
)

fun ManagedAccount.toDto(): AdminUser = AdminUser(
    id, email, firstName, lastName,
    com.persons.restrictions.contract.dto.AccountRole.valueOf(role.name),
    com.persons.restrictions.contract.dto.AccountStatus.valueOf(status.name),
    createdAt.atOffset(ZoneOffset.UTC), restriction?.toDto(),
)
