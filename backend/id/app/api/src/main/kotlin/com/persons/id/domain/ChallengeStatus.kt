package com.persons.id.domain

import java.time.Instant
import java.util.UUID

data class ChallengeStatus(val id: UUID, val expiresAt: Instant, val resendAt: Instant)
