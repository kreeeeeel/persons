package com.persons.person.maintenance.games

import com.persons.leetify.domain.CsPlayerMatch
import java.util.UUID

data class StoredCsMatch(
    val personId: UUID,
    val personTag: String,
    val personName: String,
    val avatarMediaId: UUID?,
    val match: CsPlayerMatch,
)
