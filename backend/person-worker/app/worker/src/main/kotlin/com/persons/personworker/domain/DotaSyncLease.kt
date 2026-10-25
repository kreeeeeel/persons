package com.persons.personworker.domain

import java.time.Instant
import java.util.UUID

data class DotaSyncLease(
    val personId: UUID,
    val sourceUrl: String,
    val token: UUID,
    val accountId: Long?,
    val importFrom: Instant,
    val scanFrom: Instant,
    val nextPage: Int,
    val newestMatchAt: Instant?,
)
