package com.persons.id.domain

import com.persons.requestobservability.ClientMetadata
import java.time.Instant
import java.util.UUID

data class SessionInfo(
    val id: UUID,
    val createdAt: Instant,
    val lastSeenAt: Instant,
    val expiresAt: Instant,
    val client: ClientMetadata,
    val current: Boolean,
)
