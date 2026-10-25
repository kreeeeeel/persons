package com.persons.dotabuff.domain

import java.time.Instant

data class DotaPlayerMatch(
    val matchId: Long,
    val accountId: Long,
    val playedAt: Instant,
    val durationSeconds: Int,
    val heroKey: String,
    val heroName: String,
    val won: Boolean,
    val kills: Int,
    val deaths: Int,
    val assists: Int,
    val rank: String?,
    val items: List<DotaItem>,
    val heroDamage: Int? = null,
    val buildingDamage: Int? = null,
    val neutralItem: DotaItem? = null,
    val score: Int? = null,
    val opponentScore: Int? = null,
)
