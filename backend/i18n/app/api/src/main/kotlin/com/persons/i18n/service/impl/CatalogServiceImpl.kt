package com.persons.i18n.service.impl

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.i18n.dao.entity.TranslationEntity
import com.persons.i18n.dao.entity.TranslationKeyEntity
import com.persons.i18n.dao.repository.TranslationKeyRepository
import com.persons.i18n.dao.repository.TranslationRepository
import com.persons.i18n.domain.CatalogSnapshot
import com.persons.i18n.exception.impl.InvalidCatalogException
import com.persons.i18n.service.CatalogService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.time.Instant
import java.util.HexFormat
import java.util.TreeMap
import java.util.stream.Collectors

private const val CATALOG_VERSION_HASH_LENGTH = 16
private const val MAX_CATALOG_MESSAGES = 1000
private const val MAX_MESSAGE_LENGTH = 10000
private const val MAX_LOCALE_LENGTH = 35

@Service
class CatalogServiceImpl(
    private val keys: TranslationKeyRepository,
    private val translations: TranslationRepository,
    private val mapper: ObjectMapper,
) : CatalogService {
    override fun get(locale: String, namespace: String): CatalogSnapshot {
        validate(locale, namespace)

        val keyNames = keys.findByNamespace(namespace).stream()
            .collect(Collectors.toMap({ it.id }, { it.messageKey }))
        val messages = TreeMap<String, String>()

        translations.findCatalog(locale, namespace).stream().forEach { entry ->
            val name = keyNames[entry.keyId]

            if (name != null) {
                messages[name] = entry.value
            }
        }

        val digest = MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(messages))

        return CatalogSnapshot(
            locale, namespace,
            HexFormat.of().formatHex(digest)
                .take(CATALOG_VERSION_HASH_LENGTH),
            messages,
        )
    }

    @Transactional
    override fun upsert(locale: String, namespace: String, messages: Map<String, String>): CatalogSnapshot {
        validate(locale, namespace)

        if (messages.size > MAX_CATALOG_MESSAGES ||
            messages.entries.stream().anyMatch {
                !it.key.matches(Regex("[a-zA-Z][a-zA-Z0-9_-]{0,127}")) || it.value.length > MAX_MESSAGE_LENGTH
            }
        ) {
            throw InvalidCatalogException()
        }

        val existingKeys = keys.findByNamespace(namespace).stream()
            .collect(Collectors.toMap({ it.messageKey }, { it }))
        val existingValues = translations.findCatalog(locale, namespace).stream()
            .collect(Collectors.toMap({ it.keyId }, { it }))

        messages.entries.stream().forEach { (name, value) ->
            val key = existingKeys[name] ?: keys.save(TranslationKeyEntity(namespace = namespace, messageKey = name))
            val translation = existingValues[key.id]

            if (translation == null) {
                translations.save(TranslationEntity(keyId = key.id, locale = locale, value = value))
            } else {
                translation.value = value
                translation.updatedAt = Instant.now()
            }
        }
        translations.flush()

        return get(locale, namespace)
    }

    private fun validate(locale: String, namespace: String) {
        if (!locale.matches(Regex("[a-z]{2,3}(-[A-Za-z0-9]{2,8})*")) ||
            locale.length > MAX_LOCALE_LENGTH ||
            !namespace.matches(Regex("[a-z][a-z0-9_-]{0,63}"))
        ) {
            throw InvalidCatalogException()
        }
    }
}
