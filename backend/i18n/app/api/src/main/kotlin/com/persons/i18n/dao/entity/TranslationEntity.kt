package com.persons.i18n.dao.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

private const val COLUMN_LOCALE = 35
private const val DEFAULT_VERSION = 0L

@Entity
@Table(name = "translations")
class TranslationEntity(
    @Id val id: UUID = UUID.randomUUID(),
    @Column(name = "key_id", nullable = false) val keyId: UUID,
    @Column(nullable = false, length = COLUMN_LOCALE) val locale: String,
    @Column(name = "message_value", nullable = false, columnDefinition = "text") var value: String,
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant = Instant.now(),
    @Version var version: Long = DEFAULT_VERSION,
)
