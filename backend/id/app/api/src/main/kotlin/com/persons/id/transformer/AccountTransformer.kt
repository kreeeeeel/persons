package com.persons.id.transformer

import com.persons.id.contract.dto.User
import com.persons.id.dao.entity.AccountEntity
import com.persons.id.domain.Account

fun AccountEntity.toDomain(): Account = Account(
    id,
    email,
    firstName,
    lastName,
    patronymic,
    locale,
    avatar != null || avatarObjectKey != null,
    role,
    status,
)

fun Account.toDto(): User = User(
    id = id,
    firstName = firstName,
    lastName = lastName,
    email = email,
    locale = locale,
    hasAvatar = hasAvatar,
    role = com.persons.id.contract.dto.AccountRole.valueOf(role.name),
    patronymic = patronymic,
)
