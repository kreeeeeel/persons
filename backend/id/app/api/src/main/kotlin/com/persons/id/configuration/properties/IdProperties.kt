package com.persons.id.configuration.properties

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Size
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

private const val MIN_PEPPER_LENGTH = 32
private const val MIN_JWT_SECRET_LENGTH = 32
private const val MIN_SESSION_DAYS = 1L
private const val DEFAULT_SESSION_DAYS = 30L
private const val MIN_CHALLENGE_MINUTES = 1L
private const val DEFAULT_CHALLENGE_MINUTES = 10L
private const val MIN_RESEND_SECONDS = 1L
private const val DEFAULT_RESEND_SECONDS = 60L
private const val MIN_MAX_CODE_ATTEMPTS = 1L
private const val DEFAULT_MAX_CODE_ATTEMPTS = 5
private const val MIN_MAX_LOGIN_ATTEMPTS = 1L
private const val DEFAULT_MAX_LOGIN_ATTEMPTS = 5
private const val MIN_LOCK_MINUTES = 1L
private const val DEFAULT_LOCK_MINUTES = 15L

@Validated
@ConfigurationProperties("project.id")
data class IdProperties(
    @field:Size(min = MIN_PEPPER_LENGTH)
    val pepper: String,
    @field:Size(min = MIN_JWT_SECRET_LENGTH)
    val jwtSecret: String,
    @field:Min(MIN_SESSION_DAYS)
    val sessionDays: Long = DEFAULT_SESSION_DAYS,
    @field:Min(MIN_CHALLENGE_MINUTES)
    val challengeMinutes: Long = DEFAULT_CHALLENGE_MINUTES,
    @field:Min(MIN_RESEND_SECONDS)
    val resendSeconds: Long = DEFAULT_RESEND_SECONDS,
    @field:Min(MIN_MAX_CODE_ATTEMPTS)
    val maxCodeAttempts: Int = DEFAULT_MAX_CODE_ATTEMPTS,
    @field:Min(MIN_MAX_LOGIN_ATTEMPTS)
    val maxLoginAttempts: Int = DEFAULT_MAX_LOGIN_ATTEMPTS,
    @field:Min(MIN_LOCK_MINUTES)
    val lockMinutes: Long = DEFAULT_LOCK_MINUTES,
)
