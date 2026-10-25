package com.persons.person.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "user_moderation_settings")
class UserModerationSettingsEntity(
    @Id var userId: UUID = UUID.randomUUID(),
    var forceModeration: Boolean = false,
    var updatedBy: UUID = UUID.randomUUID(),
    var updatedAt: Instant = Instant.now(),
    @Version var version: Long? = null,
)
