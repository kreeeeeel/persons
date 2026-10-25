package com.persons.personworker.component

import com.persons.dynamicproperties.DynPropertyFactory
import com.persons.personworker.domain.LeetifySettings
import org.springframework.stereotype.Component
import java.time.Duration
import java.time.Instant

@Component
class LeetifySettingsProvider {
    private val enabled = DynPropertyFactory.createBoolean("games.leetify.enabled")
        .description("Включить синхронизацию матчей Leetify").build()
    private val importFrom = DynPropertyFactory.createInstant(
        "games.leetify.importFrom", Instant.parse("2026-10-23T00:00:00Z"),
    )
        .description("Дата начала импорта матчей Leetify").build()
    private val interval = DynPropertyFactory.createInteger("games.leetify.pollIntervalSeconds", 300, 60, 86400)
        .description("Интервал проверки Leetify в секундах, от 60 до 86400").build()

    fun leetify(): LeetifySettings = LeetifySettings(
        enabled.value, importFrom.value, Duration.ofSeconds(interval.value.toLong()),
    )
}
