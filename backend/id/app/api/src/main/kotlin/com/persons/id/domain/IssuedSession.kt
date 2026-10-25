package com.persons.id.domain

import java.time.Instant

data class IssuedSession(val token: String, val expiresAt: Instant, val user: Account)
