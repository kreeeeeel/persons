package com.persons.dotabuff.configuration

import jakarta.validation.constraints.Min
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated
import java.net.URI
import java.time.Duration

@Validated
@ConfigurationProperties("integrations.dotabuff")
data class DotabuffProperties(
    val baseUrl: URI = URI("https://www.dotabuff.com"),
    val steamBaseUrl: URI = URI("https://steamcommunity.com"),
    val openDotaBaseUrl: URI = URI("https://api.opendota.com"),
    val timeout: Duration = Duration.ofSeconds(15),
    val requestInterval: Duration = Duration.ofSeconds(3),
    @field:Min(1024) val maxResponseBytes: Int = 8388608,
)
