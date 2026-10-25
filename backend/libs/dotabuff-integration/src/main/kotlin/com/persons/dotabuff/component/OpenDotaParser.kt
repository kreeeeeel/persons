package com.persons.dotabuff.component

import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.dotabuff.domain.DotaItem
import com.persons.dotabuff.domain.DotaMatchPage
import com.persons.dotabuff.domain.DotaMatchReference
import com.persons.dotabuff.domain.DotaPlayerMatch
import com.persons.dotabuff.domain.OpenDotaAsset
import com.persons.dotabuff.domain.OpenDotaCatalog
import com.persons.dotabuff.exception.DotabuffException
import java.time.Instant
import java.util.stream.Collectors
import java.util.stream.IntStream
import java.util.stream.StreamSupport

class OpenDotaParser(
    private val mapper: ObjectMapper,
) {
    fun matches(
        body: String,
        pageSize: Int,
    ): DotaMatchPage {
        val root = json(body)
        if (!root.isArray || root.size() > pageSize) {
            throw DotabuffException("INVALID_HISTORY")
        }
        val references =
            nodes(root)
                .stream()
                .map {
                    DotaMatchReference(
                        positiveLong(it, "match_id"),
                        Instant.ofEpochSecond(positiveLong(it, "start_time")),
                        rank(optionalInteger(it, "average_rank")),
                    )
                }.toList()
        if (references.zipWithNext().stream().anyMatch { it.first.playedAt.isBefore(it.second.playedAt) }) {
            throw DotabuffException("UNSORTED_HISTORY")
        }
        return DotaMatchPage(references, references.size == pageSize)
    }

    fun catalog(
        heroesBody: String,
        itemsBody: String,
    ): OpenDotaCatalog {
        val heroes = json(heroesBody)
        val items = json(itemsBody)
        if (!heroes.isObject || !items.isObject || heroes.isEmpty || items.isEmpty) {
            throw DotabuffException("INVALID_CATALOG")
        }
        return OpenDotaCatalog(
            nodes(heroes).stream().collect(
                Collectors.toMap(
                    { integer(it, "id") },
                    { asset(it.path("name").asText().removePrefix("npc_dota_hero_"), it.path("localized_name").asText()) },
                ),
            ),
            items
                .properties()
                .stream()
                .filter {
                    it.value.path("id").isIntegralNumber &&
                        it.value
                            .path("dname")
                            .asText()
                            .isNotBlank()
                }.collect(Collectors.toMap({ integer(it.value, "id") }, { asset(it.key, it.value.path("dname").asText()) })),
        )
    }

    fun match(
        body: String,
        accountId: Long,
        reference: DotaMatchReference,
        catalog: OpenDotaCatalog,
    ): DotaPlayerMatch {
        val root = json(body)
        if (positiveLong(root, "match_id") != reference.matchId ||
            !root.path("radiant_win").isBoolean ||
            !root.path("players").isArray
        ) {
            throw DotabuffException("INVALID_MATCH")
        }
        val player =
            nodes(root.path("players"))
                .stream()
                .filter { it.path("account_id").isIntegralNumber && it.path("account_id").asLong() == accountId }
                .findFirst()
                .orElse(null) ?: throw DotabuffException("PLAYER_STATS_UNAVAILABLE")
        val hero = catalog.heroes[integer(player, "hero_id")] ?: throw DotabuffException("UNKNOWN_HERO")
        val radiant = integer(player, "player_slot") < 128
        val inventory =
            IntStream
                .range(0, 6)
                .mapToObj { item(player, "item_$it", it, catalog) }
                .filter { it != null }
                .map { it ?: throw DotabuffException("INVALID_ITEM") }
                .toList()
        return DotaPlayerMatch(
            reference.matchId,
            accountId,
            Instant.ofEpochSecond(positiveLong(root, "start_time")),
            integer(root, "duration"),
            hero.key,
            hero.name,
            radiant == root.path("radiant_win").asBoolean(),
            integer(player, "kills"),
            integer(player, "deaths"),
            integer(player, "assists"),
            reference.rank,
            inventory,
            optionalInteger(player, "hero_damage"),
            optionalInteger(player, "tower_damage"),
            item(player, "item_neutral", 6, catalog),
            optionalInteger(root, if (radiant) "radiant_score" else "dire_score"),
            optionalInteger(root, if (radiant) "dire_score" else "radiant_score"),
        )
    }

    private fun item(
        player: JsonNode,
        field: String,
        slot: Int,
        catalog: OpenDotaCatalog,
    ): DotaItem? {
        val id = optionalInteger(player, field) ?: return null
        if (id == 0) {
            return null
        }
        val asset = catalog.items[id] ?: throw DotabuffException("UNKNOWN_ITEM")
        return DotaItem(asset.key, asset.name, slot)
    }

    private fun asset(
        key: String,
        name: String,
    ): OpenDotaAsset {
        if (!Regex("^[a-z0-9_]{1,100}$").matches(key) || name.isBlank()) {
            throw DotabuffException("INVALID_CATALOG")
        }
        return OpenDotaAsset(key, name)
    }

    private fun rank(tier: Int?): String? {
        if (tier == null || tier == 0) {
            return null
        }
        val name =
            mapOf(
                1 to "Herald",
                2 to "Guardian",
                3 to "Crusader",
                4 to "Archon",
                5 to "Legend",
                6 to "Ancient",
                7 to "Divine",
                8 to "Immortal",
            )[tier / 10] ?: return null
        return if (tier / 10 == 8) name else "$name ${tier % 10}"
    }

    private fun positiveLong(
        node: JsonNode,
        key: String,
    ): Long {
        val value = node.path(key)
        if (!value.isIntegralNumber || !value.canConvertToLong() || value.asLong() <= 0) {
            throw DotabuffException("INVALID_MATCH")
        }
        return value.asLong()
    }

    private fun integer(
        node: JsonNode,
        key: String,
    ): Int = optionalInteger(node, key) ?: throw DotabuffException("INVALID_PLAYER_STATS")

    private fun optionalInteger(
        node: JsonNode,
        key: String,
    ): Int? {
        val value = node.path(key)
        if (value.isMissingNode || value.isNull) {
            return null
        }
        if (!value.isIntegralNumber || !value.canConvertToInt() || value.asInt() < 0) {
            throw DotabuffException("INVALID_PLAYER_STATS")
        }
        return value.asInt()
    }

    private fun nodes(node: JsonNode): List<JsonNode> = StreamSupport.stream(node.spliterator(), false).toList()

    private fun json(body: String): JsonNode =
        try {
            mapper.readTree(body) ?: throw DotabuffException("INVALID_JSON")
        } catch (exception: JsonProcessingException) {
            throw DotabuffException("INVALID_JSON", cause = exception)
        }
}
