package com.persons.dotabuff.component

import com.persons.dotabuff.DotaClient
import com.persons.dotabuff.domain.DotaMatchPage
import com.persons.dotabuff.domain.DotaMatchReference
import com.persons.dotabuff.domain.DotaPlayerMatch
import com.persons.dotabuff.domain.OpenDotaCatalog
import com.persons.dotabuff.exception.DotabuffException
import java.time.Duration
import java.time.Instant

private const val PAGE_SIZE = 100

class HttpOpenDotaClient(
    private val http: DotabuffHttp,
    private val parser: OpenDotaParser,
) : DotaClient {
    private var catalog: OpenDotaCatalog? = null
    private var catalogExpiresAt = Instant.MIN

    override fun matches(
        accountId: Long,
        page: Int,
    ): DotaMatchPage {
        validate(accountId)
        if (page < 1) {
            throw DotabuffException("INVALID_REQUEST")
        }
        val offset = (page.toLong() - 1) * PAGE_SIZE
        return parser.matches(
            http.opendota("/api/players/$accountId/matches?limit=$PAGE_SIZE&offset=$offset&significant=0"),
            PAGE_SIZE,
        )
    }

    override fun match(
        accountId: Long,
        reference: DotaMatchReference,
    ): DotaPlayerMatch {
        validate(accountId)
        if (reference.matchId <= 0) {
            throw DotabuffException("INVALID_REQUEST")
        }
        return parser.match(http.opendota("/api/matches/${reference.matchId}"), accountId, reference, catalog())
    }

    @Synchronized
    private fun catalog(): OpenDotaCatalog {
        val current = catalog
        if (current != null && Instant.now().isBefore(catalogExpiresAt)) {
            return current
        }
        val refreshed = parser.catalog(http.opendota("/api/constants/heroes"), http.opendota("/api/constants/items"))
        catalog = refreshed
        catalogExpiresAt = Instant.now().plus(Duration.ofHours(1))
        return refreshed
    }

    private fun validate(accountId: Long) {
        if (accountId !in 1..4294967295L) {
            throw DotabuffException("INVALID_REQUEST")
        }
    }
}
