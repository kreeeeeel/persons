package com.persons.leetify.domain

import java.time.Instant
import java.util.UUID

data class CsPlayerMatch(
    val matchId: UUID,
    val steam64Id: String,
    val playedAt: Instant,
    val mapName: String,
    val mode: CsMatchMode,
    val outcome: CsMatchOutcome,
    val score: Int,
    val opponentScore: Int,
    val kills: Int,
    val deaths: Int,
    val assists: Int,
    val durationSeconds: Int? = null,
    val rank: Int? = null,
    val faceitLevel: Int? = null,
    val faceitElo: Int? = null,
    val kd: Double? = null,
    val adr: Double? = null,
    val hsPercent: Double? = null,
    val leetifyRating: Double? = null,
    val personalPerformance: Double? = null,
)
