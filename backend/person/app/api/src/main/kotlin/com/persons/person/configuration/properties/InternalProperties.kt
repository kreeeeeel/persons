package com.persons.person.configuration.properties

import jakarta.validation.constraints.Size
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

@Validated
@ConfigurationProperties("project.internal")
class InternalProperties(@field:Size(min = 32) val jwtSecret: String)
