package com.persons.personworker.domain

import java.time.Instant
import java.util.UUID

data class LeetifySyncLease(val personId: UUID, val sourceUrl: String, val token: UUID, val importFrom: Instant)
