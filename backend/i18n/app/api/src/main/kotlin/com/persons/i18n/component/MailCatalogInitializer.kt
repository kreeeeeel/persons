package com.persons.i18n.component

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.i18n.service.CatalogService
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Component
import java.util.stream.Collectors

private const val MAIL_NAMESPACE = "mail"

@Component
class MailCatalogInitializer(private val mapper: ObjectMapper, private val catalogs: CatalogService) :
    ApplicationRunner {
    override fun run(args: ApplicationArguments) {
        val defaults = ClassPathResource("catalogs/mail.json").inputStream.use {
            mapper.readValue(it, object : TypeReference<Map<String, Map<String, String>>>() {})
        }

        defaults.entries.stream().forEach { (locale, messages) ->
            val existing = catalogs.get(locale, MAIL_NAMESPACE).messages
            val missing = messages.entries.stream().filter { !existing.containsKey(it.key) }
                .collect(Collectors.toMap({ it.key }, { it.value }))

            if (missing.isNotEmpty()) {
                catalogs.upsert(locale, MAIL_NAMESPACE, missing)
            }
        }
    }
}
