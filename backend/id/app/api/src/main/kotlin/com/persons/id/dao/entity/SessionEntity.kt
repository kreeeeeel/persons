package com.persons.id.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "sessions")
class SessionEntity(
    @Id
    var id: UUID = UUID.randomUUID(),
    var userId: UUID = UUID.randomUUID(),
    var tokenHash: String = "",
    var previousTokenHash: String? = null,
    var previousTokenValidUntil: Instant? = null,
    var tokenIssuedAt: Instant = Instant.now(),
    var createdAt: Instant = Instant.now(),
    var lastSeenAt: Instant = Instant.now(),
    var expiresAt: Instant = Instant.now(),
    var revoked: Boolean = false,
    var ip: String = "",
    var userAgent: String = "",
    var os: String = "",
    var osVersion: String = "",
    var browser: String = "",
    var device: String = "",
    var origin: String = "",
    var region: String = "",
    @Version
    var version: Long? = null,
)
