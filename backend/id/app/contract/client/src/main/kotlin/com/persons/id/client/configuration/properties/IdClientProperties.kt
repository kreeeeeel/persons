package com.persons.id.client.configuration.properties

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Pattern
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

private const val MIN_CONNECT_TIMEOUT_MS = 1L
private const val DEFAULT_CONNECT_TIMEOUT_MS = 2000
private const val MIN_READ_TIMEOUT_MS = 1L
private const val DEFAULT_READ_TIMEOUT_MS = 5000L
private const val MIN_MAX_BUFFER_SIZE = 1024L
private const val DEFAULT_MAX_BUFFER_SIZE = 1048576

@Validated
@ConfigurationProperties("project.id-client")
data class IdClientProperties(
    @field:Pattern(regexp = "https?://[^/\\s]+.*")
    val baseUri: String,
    @field:Min(MIN_CONNECT_TIMEOUT_MS)
    val connectTimeoutMs: Int = DEFAULT_CONNECT_TIMEOUT_MS,
    @field:Min(MIN_READ_TIMEOUT_MS)
    val readTimeoutMs: Long = DEFAULT_READ_TIMEOUT_MS,
    @field:Min(MIN_MAX_BUFFER_SIZE)
    val maxBufferSize: Int = DEFAULT_MAX_BUFFER_SIZE,
)
