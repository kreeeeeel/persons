package com.persons.person.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

private const val SETTINGS_ID = 1

@Entity
@Table(name = "site_settings")
class SiteSettingsEntity(
    @Id var id: Int = SETTINGS_ID,
    var marqueeEnabled: Boolean = true,
    var updatedBy: UUID? = null,
    var updatedAt: Instant? = null,
    @Version var version: Long? = null,
)
