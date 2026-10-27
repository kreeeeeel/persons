package com.persons.dotabuff.domain

import java.time.Instant

data class DotaMatchReference(
    val matchId: Long,
    val playedAt: Instant,
)
