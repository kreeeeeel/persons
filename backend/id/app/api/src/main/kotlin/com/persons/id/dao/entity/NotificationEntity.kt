package com.persons.id.dao.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

private const val INITIAL_ATTEMPTS = 0

@Entity
@Table(name = "notification_outbox")
class NotificationEntity(
    @Id
    var id: UUID = UUID.randomUUID(),
    var recipient: String = "",
    var subject: String = "",
    @Column(columnDefinition = "text")
    var html: String = "",
    var requestId: String = "",
    var attempts: Int = INITIAL_ATTEMPTS,
    var nextAttemptAt: Instant = Instant.now(),
    var expiresAt: Instant = Instant.now(),
    var accepted: Boolean = false,
    @Version
    var version: Long? = null,
)
