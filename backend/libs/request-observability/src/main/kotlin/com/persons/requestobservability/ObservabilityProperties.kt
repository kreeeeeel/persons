package com.persons.requestobservability

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

private const val MIN_MAX_BODY_BYTES = 1024L
private const val MAX_MAX_BODY_BYTES = 1048576L
private const val DEFAULT_MAX_BODY_BYTES = 65536

@Validated
@ConfigurationProperties("project.observability")
data class ObservabilityProperties(
    val bodiesEnabled: Boolean = false,
    @field:Min(MIN_MAX_BODY_BYTES)
    @field:Max(MAX_MAX_BODY_BYTES)
    val maxBodyBytes: Int = DEFAULT_MAX_BODY_BYTES,
    val maskedFields: List<String> = emptyList(),
    val maskedHeaders: List<String> = emptyList(),
    val maskedPathSegments: List<String> = listOf("invite", "invitations"),
)
