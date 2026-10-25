package com.persons.person.maintenance.games

import com.persons.dotabuff.domain.DotaPlayerMatch
import java.util.UUID

data class StoredDotaMatch(
    val personId: UUID,
    val personTag: String,
    val personName: String,
    val avatarMediaId: UUID?,
    val match: DotaPlayerMatch,
)
