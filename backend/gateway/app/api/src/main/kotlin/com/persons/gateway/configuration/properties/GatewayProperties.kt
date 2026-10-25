package com.persons.gateway.configuration.properties

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated
import java.time.Duration

@Validated
@ConfigurationProperties("project.gateway")
data class GatewayProperties(
    @field:NotBlank val idUri: String,
    @field:NotBlank val personUri: String,
    @field:Size(min = 32) val jwtSecret: String,
    val connectTimeout: Duration = Duration.ofSeconds(3),
    val requestTimeout: Duration = Duration.ofMinutes(10),
)
