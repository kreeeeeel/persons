package com.persons.idcontext

import java.time.Instant
import java.util.UUID

data class UserPrincipal(
    val userId: UUID,
    val sessionId: UUID,
    val email: String,
    val locale: String,
    val expiresAt: Instant,
)
