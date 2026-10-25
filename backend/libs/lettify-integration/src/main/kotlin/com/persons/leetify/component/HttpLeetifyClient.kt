package com.persons.leetify.component

import com.persons.leetify.LeetifyClient
import com.persons.leetify.domain.CsPlayerMatch
import com.persons.leetify.domain.LeetifyProfile
import com.persons.leetify.exception.LeetifyException
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.util.UUID

class HttpLeetifyClient(
    private val http: LeetifyHttp,
    private val parser: LeetifyParser,
) : LeetifyClient {
    override fun profile(steam64Id: String): LeetifyProfile {
        validate(steam64Id)
        return parser.profile(http.get("/v3/profile?steam64_id=$steam64Id"), steam64Id)
    }

    override fun matches(steam64Id: String): List<CsPlayerMatch> {
        val profile = profile(steam64Id)
        return parser.matches(http.get("/v3/profile/matches?steam64_id=$steam64Id"), profile)
    }

    override fun match(
        gameId: UUID,
        steam64Id: String,
    ): CsPlayerMatch {
        validate(steam64Id)
        return parser.match(http.get("/v2/matches/$gameId"), steam64Id)
    }

    override fun match(
        dataSource: String,
        dataSourceId: String,
        steam64Id: String,
    ): CsPlayerMatch {
        validate(steam64Id)
        if (!Regex("^[a-z_]{1,40}$").matches(dataSource) || dataSourceId.isBlank() || dataSourceId.length > 200) {
            throw LeetifyException("INVALID_MATCH_REFERENCE")
        }
        val source =
            if (dataSource in setOf("matchmaking_competitive", "matchmaking_wingman")) {
                "matchmaking"
            } else {
                dataSource
            }
        val encoded = URLEncoder.encode(dataSourceId, StandardCharsets.UTF_8)
        return parser.match(http.get("/v2/matches/$source/$encoded"), steam64Id)
    }

    private fun validate(steamId: String) {
        if (!Regex("^7656119[0-9]{10}$").matches(steamId)) {
            throw LeetifyException("INVALID_STEAM_ID")
        }
    }
}
