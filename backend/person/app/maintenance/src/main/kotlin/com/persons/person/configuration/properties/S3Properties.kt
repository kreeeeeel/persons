package com.persons.person.configuration.properties

import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

@Validated
@ConfigurationProperties("s3")
class S3Properties(
    @field:Pattern(regexp = "https?://[^/\\s]+/?")
    val endpoint: String,
    @field:NotBlank
    val region: String,
    @field:NotBlank
    val bucket: String,
    @field:Valid
    val credentials: S3Credentials,
    @field:Pattern(regexp = "[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*")
    val objectPrefix: String = "person-media",
)
