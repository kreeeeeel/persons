package com.persons.id.domain

import java.time.Instant

data class VerificationGrant(val grant: String, val expiresAt: Instant)
