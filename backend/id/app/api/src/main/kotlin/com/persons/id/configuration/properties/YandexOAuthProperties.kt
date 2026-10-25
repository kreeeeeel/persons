package com.persons.id.configuration.properties

import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

@Validated
@ConfigurationProperties("project.oauth.yandex")
data class YandexOAuthProperties(
    val clientId: String = "",
    val clientSecret: String = "",
    @field:Pattern(regexp = "https?://[^\\s]+")
    val redirectUri: String = "http://localhost:3000/api/oauth/yandex/callback",
    @field:Positive val timeoutMillis: Long = 10000,
)
