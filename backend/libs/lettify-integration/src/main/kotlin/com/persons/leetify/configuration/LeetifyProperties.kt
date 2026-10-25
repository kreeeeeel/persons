package com.persons.leetify.configuration

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated
import java.net.URI
import java.time.Duration

@Validated
@ConfigurationProperties("integrations.leetify")
class LeetifyProperties(
    val baseUrl: URI = URI("https://api-public.cs-prod.leetify.com"),
    val apiKey: String = "",
    val timeout: Duration = Duration.ofSeconds(20),
    val requestInterval: Duration = Duration.ofSeconds(1),
    @field:Min(1024) @field:Max(16777216) val maxResponseBytes: Int = 8388608,
)
