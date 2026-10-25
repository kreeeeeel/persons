package com.persons.leetify

import com.persons.leetify.domain.CsPlayerMatch
import com.persons.leetify.domain.LeetifyProfile
import java.util.UUID

interface LeetifyClient {
    fun profile(steam64Id: String): LeetifyProfile

    fun matches(steam64Id: String): List<CsPlayerMatch>

    fun match(
        gameId: UUID,
        steam64Id: String,
    ): CsPlayerMatch

    fun match(
        dataSource: String,
        dataSourceId: String,
        steam64Id: String,
    ): CsPlayerMatch
}
