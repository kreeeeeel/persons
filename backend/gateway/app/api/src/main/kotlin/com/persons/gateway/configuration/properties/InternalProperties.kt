package com.persons.gateway.configuration.properties

import jakarta.validation.constraints.Size
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

@Validated
@ConfigurationProperties("project.internal")
data class InternalProperties(@field:Size(min = 32) val jwtSecret: String)
