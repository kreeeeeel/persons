package com.persons.person.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

private const val SETTINGS_ID = 1

@Entity
@Table(name = "publication_settings")
class PublicationSettingsEntity(
    @Id var id: Int = SETTINGS_ID,
    var commentsRequireModeration: Boolean = true,
    var photosRequireModeration: Boolean = true,
    var momentsRequireModeration: Boolean = true,
    var reviewsRequireModeration: Boolean = true,
    var loansRequireModeration: Boolean = true,
    var pagesRequireModeration: Boolean = true,
    var profileChangesRequireModeration: Boolean = true,
    var avatarsRequireModeration: Boolean = true,
    var updatedBy: UUID? = null,
    var updatedAt: Instant? = null,
    @Version var version: Long? = null,
)
