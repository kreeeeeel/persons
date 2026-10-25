package com.persons.gateway.transformer

import com.persons.id.client.generated.model.AdminUser
import com.persons.id.client.generated.model.AdminUsers
import com.persons.person.contract.dto.UpdateAccess
import com.persons.restrictions.client.generated.model.UpdateAccess as RestrictionsUpdateAccess

fun AdminUser.toDto(): com.persons.person.contract.dto.AdminUser = com.persons.person.contract.dto.AdminUser(
    id, email, firstName, lastName,
    com.persons.person.contract.dto.AccountRole.valueOf(role.value),
    com.persons.person.contract.dto.AccountStatus.valueOf(status.value),
    createdAt,
    patronymic = patronymic,
)

fun AdminUsers.toDto(): com.persons.person.contract.dto.AdminUsers = com.persons.person.contract.dto.AdminUsers(
    items.stream().map {
        it.toDto()
    }.toList(),
    total, page, propertySize,
)

fun UpdateAccess.toClient(): RestrictionsUpdateAccess = RestrictionsUpdateAccess(
    com.persons.restrictions.client.generated.model.AccountRole.valueOf(role.value),
    com.persons.restrictions.client.generated.model.AccountStatus.valueOf(status.value),
)

fun com.persons.restrictions.client.generated.model.AdminUser.toDto(): com.persons.person.contract.dto.AdminUser =
    com.persons.person.contract.dto.AdminUser(
        id, email, firstName, lastName,
        com.persons.person.contract.dto.AccountRole.valueOf(role.value),
        com.persons.person.contract.dto.AccountStatus.valueOf(status.value),
        createdAt, restriction?.toDto(),
    )

fun com.persons.id.client.generated.model.Session.toDto(): com.persons.person.contract.dto.AdminSession =
    com.persons.person.contract.dto.AdminSession(
        id = id,
        ip = ip,
        browser = browser,
        os = os,
        osVersion = osVersion,
        device = device,
        origin = origin,
        region = region,
        createdAt = createdAt,
        lastSeenAt = lastSeenAt,
        expiresAt = expiresAt,
    )

fun com.persons.person.contract.dto.UserProfileUpdate.toClient(): com.persons.id.client.generated.model.ChangeProfile =
    com.persons.id.client.generated.model.ChangeProfile(firstName, lastName, patronymic)
