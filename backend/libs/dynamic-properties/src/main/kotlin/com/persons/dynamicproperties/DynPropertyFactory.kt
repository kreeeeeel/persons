package com.persons.dynamicproperties

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.JsonNode
import com.persons.dynamicproperties.domain.DynType
import java.time.Duration
import java.time.Instant

object DynPropertyFactory {
    fun createEmail(
        key: String,
        default: String = "",
    ): DynPropertyBuilder<String> =
        builder(key, DynType.STRING, default, { it.asText() }, """{"type":"string","format":"email","maxLength":254}""")

    fun createLocalizedStrings(
        key: String,
        default: Map<String, String>,
        maxLength: Int = 1000,
    ): DynPropertyBuilder<Map<String, String>> {
        val schema = DynJson.mapper.createObjectNode().put("type", "object")
        val properties = schema.putObject("properties")
        default.keys.stream().forEach { properties.putObject(it).put("type", "string").put("maxLength", maxLength) }
        return DynPropertyBuilder(key, DynType.MAP, default, { DynJson.mapper.writeValueAsString(it) }, { node ->
            default.keys.stream().collect(
                java.util.stream.Collectors
                    .toMap({ it }, { node[it].asText() }),
            )
        }, schema)
    }

    fun createLocalizedStringLists(
        key: String,
        default: Map<String, List<String>>,
    ): DynPropertyBuilder<Map<String, List<String>>> {
        val schema = DynJson.mapper.createObjectNode().put("type", "object")
        val properties = schema.putObject("properties")
        default.keys.stream().forEach {
            properties
                .putObject(it)
                .put("type", "array")
                .put("maxItems", 10)
                .putObject("items")
                .put("type", "string")
                .put("maxLength", 500)
        }
        return DynPropertyBuilder(key, DynType.JSON, default, { DynJson.mapper.writeValueAsString(it) }, { node ->
            default.keys.stream().collect(
                java.util.stream.Collectors.toMap({ it }, { locale ->
                    java.util.stream.StreamSupport
                        .stream(node[locale].spliterator(), false)
                        .map { it.asText() }
                        .toList()
                }),
            )
        }, schema)
    }

    fun createBoolean(
        key: String,
        default: Boolean = false,
    ): DynPropertyBuilder<Boolean> = builder(key, DynType.BOOLEAN, default, { it.asBoolean() }, """{"type":"boolean"}""")

    fun createString(
        key: String,
        default: String = "",
    ): DynPropertyBuilder<String> = builder(key, DynType.STRING, default, { it.asText() }, """{"type":"string"}""")

    fun createInteger(
        key: String,
        default: Int,
        minimum: Int = Int.MIN_VALUE,
        maximum: Int = Int.MAX_VALUE,
    ): DynPropertyBuilder<Int> =
        builder(key, DynType.NUMBER, default, { it.asInt() }, """{"type":"integer","minimum":$minimum,"maximum":$maximum}""")

    fun createInstant(
        key: String,
        default: Instant,
    ): DynPropertyBuilder<Instant> =
        DynPropertyBuilder(
            key,
            DynType.INSTANT,
            default,
            { DynJson.mapper.writeValueAsString(it.toString()) },
            { Instant.parse(it.asText()) },
            DynJson.mapper.readTree("""{"type":"string","format":"date-time"}"""),
        )

    fun createDuration(
        key: String,
        default: Duration,
    ): DynPropertyBuilder<Duration> =
        DynPropertyBuilder(
            key,
            DynType.DURATION,
            default,
            { DynJson.mapper.writeValueAsString(it.toString()) },
            { Duration.parse(it.asText()) },
            DynJson.mapper.readTree("""{"type":"string","format":"duration"}"""),
        )

    fun createRolloutPercentageFeatureToggle(
        key: String,
        default: Int = 0,
    ): DynPropertyBuilder<Rollout> =
        DynPropertyBuilder(
            key,
            DynType.ROLLOUT,
            Rollout(default),
            { it.percentage.toString() },
            { Rollout(it.asInt()) },
            DynJson.mapper.readTree("""{"type":"integer","minimum":0,"maximum":100}"""),
        )

    fun <T> createJson(
        key: String,
        default: T,
        type: TypeReference<T>,
    ): DynPropertyBuilder<T> =
        DynPropertyBuilder(
            key,
            DynType.JSON,
            default,
            { DynJson.mapper.writeValueAsString(it) },
            { DynJson.mapper.convertValue(it, type) },
            DynJson.mapper.createObjectNode(),
        )

    private fun <T> builder(
        key: String,
        type: DynType,
        default: T,
        decode: (JsonNode) -> T,
        schema: String,
    ): DynPropertyBuilder<T> =
        DynPropertyBuilder(key, type, default, { DynJson.mapper.writeValueAsString(it) }, decode, DynJson.mapper.readTree(schema))
}
