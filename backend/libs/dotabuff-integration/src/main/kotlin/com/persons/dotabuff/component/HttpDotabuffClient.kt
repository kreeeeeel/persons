package com.persons.dotabuff.component

import com.persons.dotabuff.DotabuffClient
import com.persons.dotabuff.domain.DotaMatchPage
import com.persons.dotabuff.domain.DotaMatchReference
import com.persons.dotabuff.domain.DotaPlayerMatch
import com.persons.dotabuff.exception.DotabuffException

class HttpDotabuffClient(
    private val http: DotabuffHttp,
    private val parser: DotabuffParser,
) : DotabuffClient {
    override fun matches(
        accountId: Long,
        page: Int,
    ): DotaMatchPage {
        if (accountId !in 1..4294967295L || page < 1) {
            throw DotabuffException("INVALID_REQUEST")
        }
        return parser.matches(http.dota("/players/$accountId/matches?date=all&page=$page"))
    }

    override fun match(
        accountId: Long,
        reference: DotaMatchReference,
    ): DotaPlayerMatch = parser.match(http.dota("/matches/${reference.matchId}"), accountId, reference)
}
