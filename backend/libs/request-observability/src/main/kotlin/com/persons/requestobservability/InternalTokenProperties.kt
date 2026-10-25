package com.persons.requestobservability

import jakarta.validation.constraints.Size
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

private const val MIN_JWT_SECRET_LENGTH = 32

@Validated
@ConfigurationProperties("project.internal")
data class InternalTokenProperties(@field:Size(min = MIN_JWT_SECRET_LENGTH) val jwtSecret: String)
