package com.persons.id.domain

import java.time.Instant
import java.util.UUID

data class AdminAccount(
    val id: UUID,
    val email: String,
    val firstName: String,
    val lastName: String,
    val role: AccountRole,
    val status: AccountStatus,
    val createdAt: Instant,
    val patronymic: String? = null,
)
