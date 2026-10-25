package com.persons.leetify.component

import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.leetify.domain.CsMatchMode
import com.persons.leetify.domain.CsMatchOutcome
import com.persons.leetify.domain.CsPlayerMatch
import com.persons.leetify.domain.LeetifyMatchReference
import com.persons.leetify.domain.LeetifyProfile
import com.persons.leetify.exception.LeetifyException
import java.time.Instant
import java.time.format.DateTimeParseException
import java.util.UUID
import java.util.stream.Collectors
import java.util.stream.StreamSupport

class LeetifyParser(
    private val mapper: ObjectMapper,
) {
    fun profile(
        body: String,
        steamId: String,
    ): LeetifyProfile {
        val root = json(body)
        if (root.path("privacy_mode").asText() in setOf("private", "friends")) {
            throw LeetifyException("PROFILE_PRIVATE")
        }
        if (root.path("privacy_mode").asText() != "public" ||
            root.path("steam64_id").asText() != steamId ||
            !root.path("recent_matches").isArray
        ) {
            throw LeetifyException("INVALID_PROFILE")
        }
        return LeetifyProfile(
            steamId,
            nodes(root.path("recent_matches"))
                .stream()
                .map { row ->
                    val id =
                        try {
                            UUID.fromString(row.path("id").asText())
                        } catch (exception: IllegalArgumentException) {
                            throw LeetifyException("INVALID_PROFILE", cause = exception)
                        }
                    LeetifyMatchReference(
                        id,
                        row.get("rank_type")?.takeUnless { it.isNull }?.asText(),
                        row.get("rank")?.takeIf { it.isIntegralNumber && it.asInt() > 0 }?.asInt(),
                        row.get("faceit_elo")?.takeIf { it.isIntegralNumber && it.asInt() >= 0 }?.asInt(),
                    )
                }.toList(),
        )
    }

    fun matches(
        body: String,
        profile: LeetifyProfile,
    ): List<CsPlayerMatch> {
        val root = json(body)
        if (!root.isArray) {
            throw LeetifyException("INVALID_HISTORY")
        }
        val summaries = profile.recentMatches.stream().collect(Collectors.toMap({ it.matchId.toString() }, { it }))
        return nodes(root).stream().map { match(it, profile.steam64Id, summaries[it.path("id").asText()]) }.toList()
    }

    fun match(
        body: String,
        steamId: String,
    ): CsPlayerMatch = match(json(body), steamId, null)

    private fun match(
        root: JsonNode,
        steamId: String,
        summary: LeetifyMatchReference?,
    ): CsPlayerMatch {
        val player =
            nodes(root.path("stats"))
                .stream()
                .filter { it.path("steam64_id").asText() == steamId }
                .findFirst()
                .orElse(null)
        if (player == null) {
            throw LeetifyException("PLAYER_STATS_UNAVAILABLE")
        }
        val id: UUID
        val playedAt: Instant
        try {
            id = UUID.fromString(root.path("id").asText())
            playedAt = Instant.parse(root.path("finished_at").asText())
        } catch (exception: IllegalArgumentException) {
            throw LeetifyException("INVALID_MATCH", cause = exception)
        } catch (exception: DateTimeParseException) {
            throw LeetifyException("INVALID_MATCH", cause = exception)
        }
        val map = root.path("map_name").asText()
        if (!Regex("^(de|cs|ar)_[a-z0-9_]{1,64}$").matches(map)) {
            throw LeetifyException("INVALID_MAP")
        }
        val score = integer(player, "rounds_won")
        val opponentScore = integer(player, "rounds_lost")
        val mode = mode(root.path("data_source").asText(), summary?.rankType)
        val rank = summary?.rank
        val kills = integer(player, "total_kills")
        val headshots = optionalNumber(player, "total_hs_kills")
        if (headshots != null && (headshots < 0 || headshots > kills || headshots % 1 != 0.0)) {
            throw LeetifyException("INVALID_HEADSHOTS")
        }
        val duration = root.get("duration_seconds")?.takeIf { it.isIntegralNumber && it.asInt() > 0 }?.asInt()
        return CsPlayerMatch(
            id,
            steamId,
            playedAt,
            map,
            mode,
            if (score > opponentScore) {
                CsMatchOutcome.VICTORY
            } else if (score < opponentScore) {
                CsMatchOutcome.DEFEAT
            } else {
                CsMatchOutcome.DRAW
            },
            score,
            opponentScore,
            kills,
            integer(player, "total_deaths"),
            integer(player, "total_assists"),
            durationSeconds = duration,
            rank = rank?.takeIf { mode != CsMatchMode.FACEIT },
            faceitLevel = rank?.takeIf { mode == CsMatchMode.FACEIT && it in 1..10 },
            faceitElo = summary?.faceitElo?.takeIf { mode == CsMatchMode.FACEIT },
            kd = nonnegative(player, "kd_ratio"),
            adr = nonnegative(player, "dpr"),
            hsPercent = headshots?.let { if (kills == 0) 0.0 else it * 100.0 / kills },
            leetifyRating = optionalNumber(player, "leetify_rating"),
            personalPerformance = optionalNumber(player, "personal_performance_rating"),
        )
    }

    private fun mode(
        source: String,
        rankType: String?,
    ): CsMatchMode =
        when (source) {
            "faceit" -> CsMatchMode.FACEIT
            "matchmaking_competitive" -> CsMatchMode.COMPETITIVE
            "matchmaking_wingman" -> CsMatchMode.WINGMAN
            "matchmaking" ->
                when (rankType) {
                    "11", "premier" -> CsMatchMode.PREMIER
                    "6", "12", "competitive", "matchmaking" -> CsMatchMode.COMPETITIVE
                    "7", "wingman" -> CsMatchMode.WINGMAN
                    else -> CsMatchMode.OTHER
                }
            else -> CsMatchMode.OTHER
        }

    private fun integer(
        node: JsonNode,
        key: String,
    ): Int {
        val value = node.path(key)
        if (!value.isIntegralNumber || !value.canConvertToInt() || value.asInt() < 0) {
            throw LeetifyException("INVALID_PLAYER_STATS")
        }
        return value.asInt()
    }

    private fun nonnegative(
        node: JsonNode,
        key: String,
    ): Double? {
        val value = optionalNumber(node, key)
        if (value != null && value < 0) {
            throw LeetifyException("INVALID_PLAYER_STATS")
        }
        return value
    }

    private fun optionalNumber(
        node: JsonNode,
        key: String,
    ): Double? {
        val value = node.get(key)
        if (value == null || value.isNull) {
            return null
        }
        if (!value.isNumber || !value.asDouble().isFinite()) {
            throw LeetifyException("INVALID_PLAYER_STATS")
        }
        return value.asDouble()
    }

    private fun nodes(node: JsonNode): List<JsonNode> = StreamSupport.stream(node.spliterator(), false).toList()

    private fun json(body: String): JsonNode =
        try {
            val root = mapper.readTree(body)
            if (root == null) {
                throw LeetifyException("INVALID_JSON")
            }
            root
        } catch (exception: JsonProcessingException) {
            throw LeetifyException("INVALID_JSON", cause = exception)
        }
}
