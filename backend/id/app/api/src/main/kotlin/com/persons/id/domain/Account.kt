package com.persons.id.domain

import java.util.UUID

data class Account(
    val id: UUID,
    val email: String,
    val firstName: String,
    val lastName: String,
    val patronymic: String?,
    val locale: String,
    val hasAvatar: Boolean,
    val role: AccountRole = AccountRole.USER,
    val status: AccountStatus = AccountStatus.ACTIVE,
)
