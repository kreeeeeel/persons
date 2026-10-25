package com.persons.person.transformer

import com.persons.leetify.domain.CsPlayerMatch
import com.persons.person.contract.dto.CsMatch
import com.persons.person.contract.dto.CsMatchMode
import com.persons.person.contract.dto.CsMatchOutcome
import org.springframework.stereotype.Component
import java.net.URI
import java.time.ZoneOffset

@Component
class CsMatchTransformer {
    fun convert(match: CsPlayerMatch): CsMatch = CsMatch(
        id = match.matchId, mapName = match.mapName, mode = CsMatchMode.valueOf(match.mode.name),
        outcome = CsMatchOutcome.valueOf(match.outcome.name), score = match.score, opponentScore = match.opponentScore,
        kills = match.kills, deaths = match.deaths, assists = match.assists,
        playedAt = match.playedAt.atOffset(ZoneOffset.UTC),
        matchUrl = URI("https://leetify.com/app/match-details/${match.matchId}"),
        durationSeconds = match.durationSeconds, rank = match.rank, faceitLevel = match.faceitLevel,
        faceitElo = match.faceitElo, kd = match.kd, adr = match.adr, hsPercent = match.hsPercent,
        leetifyRating = match.leetifyRating, personalPerformance = match.personalPerformance,
    )
}
