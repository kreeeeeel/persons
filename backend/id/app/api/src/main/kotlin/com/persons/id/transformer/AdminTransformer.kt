package com.persons.id.transformer

import com.persons.id.contract.dto.AdminUser
import com.persons.id.dao.entity.AccountEntity
import com.persons.id.domain.AdminAccount
import java.time.ZoneOffset

fun AccountEntity.toAdminDomain(): AdminAccount = AdminAccount(
    id, email, firstName, lastName, role, status, createdAt, patronymic,
)

fun AdminAccount.toDto(): AdminUser = AdminUser(
    id, email, firstName, lastName,
    com.persons.id.contract.dto.AccountRole.valueOf(role.name),
    com.persons.id.contract.dto.AccountStatus.valueOf(status.name),
    createdAt.atOffset(ZoneOffset.UTC),
    patronymic,
)
