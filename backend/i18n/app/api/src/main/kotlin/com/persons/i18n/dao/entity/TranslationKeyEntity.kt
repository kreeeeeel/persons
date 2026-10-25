package com.persons.i18n.dao.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

private const val COLUMN_NAMESPACE = 64
private const val COLUMN_MESSAGE_KEY = 128

@Entity
@Table(name = "translation_keys")
class TranslationKeyEntity(
    @Id val id: UUID = UUID.randomUUID(),
    @Column(nullable = false, length = COLUMN_NAMESPACE) val namespace: String,
    @Column(name = "message_key", nullable = false, length = COLUMN_MESSAGE_KEY) val messageKey: String,
)
