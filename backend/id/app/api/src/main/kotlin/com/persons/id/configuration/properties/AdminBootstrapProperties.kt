package com.persons.id.configuration.properties

import jakarta.validation.constraints.Email
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

@Validated
@ConfigurationProperties("project.admin")
data class AdminBootstrapProperties(@field:Email val bootstrapEmail: String = "")
