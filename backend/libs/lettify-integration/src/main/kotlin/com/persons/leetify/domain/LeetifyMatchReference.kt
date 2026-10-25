package com.persons.leetify.domain

import java.util.UUID

data class LeetifyMatchReference(
    val matchId: UUID,
    val rankType: String?,
    val rank: Int?,
    val faceitElo: Int?,
)
