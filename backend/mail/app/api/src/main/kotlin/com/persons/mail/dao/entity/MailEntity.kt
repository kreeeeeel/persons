package com.persons.mail.dao.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

private const val INITIAL_ATTEMPTS = 0
private const val QUEUED = "QUEUED"

@Entity
@Table(name = "mail_messages")
class MailEntity(
    @Id
    var id: UUID = UUID.randomUUID(),
    var recipient: String = "",
    var subject: String = "",
    @Column(columnDefinition = "text")
    var html: String = "",
    var status: String = QUEUED,
    var attempts: Int = INITIAL_ATTEMPTS,
    var nextAttemptAt: Instant = Instant.now(),
    var createdAt: Instant = Instant.now(),
    @Version
    var version: Long? = null,
)
