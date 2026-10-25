package com.persons.personworker.component

import com.persons.dynamicproperties.DynPropertyFactory
import com.persons.personworker.domain.DotabuffSettings
import org.springframework.stereotype.Component
import java.time.Duration
import java.time.Instant

@Component
class DotabuffSettingsProvider {
    private val enabled = DynPropertyFactory.createBoolean("games.dotabuff.enabled")
        .description("Включить синхронизацию матчей OpenDota").build()
    private val importFrom = DynPropertyFactory.createInstant(
        "games.dotabuff.importFrom", Instant.parse("2026-10-22T00:00:00Z"),
    )
        .description("Дата начала импорта матчей OpenDota").build()
    private val interval = DynPropertyFactory.createInteger("games.dotabuff.pollIntervalSeconds", 300, 60, 86400)
        .description("Интервал проверки OpenDota в секундах, от 60 до 86400").build()

    fun dotabuff(): DotabuffSettings =
        DotabuffSettings(enabled.value, importFrom.value, Duration.ofSeconds(interval.value.toLong()))
}
