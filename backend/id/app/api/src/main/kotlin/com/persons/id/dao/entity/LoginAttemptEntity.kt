package com.persons.id.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "login_attempts")
class LoginAttemptEntity(
    @Id
    var id: UUID = UUID.randomUUID(),
    var ip: String = "",
    var createdAt: Instant = Instant.now(),
    @Version
    var version: Long? = null,
)
