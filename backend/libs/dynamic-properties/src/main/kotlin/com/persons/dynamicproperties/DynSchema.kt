package com.persons.dynamicproperties

import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.JsonNode
import com.persons.dynamicproperties.domain.DynSpec
import com.persons.dynamicproperties.domain.DynType
import com.persons.dynamicproperties.exception.DynPropertyException
import java.time.Duration
import java.time.Instant
import java.time.format.DateTimeParseException
import java.util.Spliterators
import java.util.stream.StreamSupport

private val propertyKey = Regex("^[a-zA-Z][a-zA-Z0-9.]{0,119}$")

object DynSchema {
    private val reader =
        DynJson.mapper
            .reader()
            .with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .with(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)

    fun parseSchema(raw: String): JsonNode {
        if (raw.length > 16384) {
            throw DynPropertyException("INVALID_DECLARATION")
        }
        val schema =
            try {
                reader.readTree(raw)
            } catch (exception: JsonProcessingException) {
                throw DynPropertyException("INVALID_DECLARATION", exception)
            }
        if (schema == null || !schema.isObject) {
            throw DynPropertyException("INVALID_DECLARATION")
        }
        return schema
    }

    fun validate(
        definition: DynSpec,
        raw: String,
    ): JsonNode {
        if (!propertyKey.matches(definition.key) || raw.length > 16384 || definition.description.length > 1000) {
            throw DynPropertyException("INVALID_VALUE")
        }
        val node =
            try {
                reader.readTree(raw) ?: throw DynPropertyException("INVALID_VALUE")
            } catch (exception: JsonProcessingException) {
                throw DynPropertyException("INVALID_VALUE", exception)
            }
        val correctType =
            when (definition.type) {
                DynType.BOOLEAN -> node.isBoolean
                DynType.NUMBER -> node.isNumber
                DynType.STRING, DynType.INSTANT, DynType.DURATION -> node.isTextual
                DynType.MAP -> node.isObject
                DynType.ROLLOUT -> node.isIntegralNumber && node.canConvertToInt() && node.asInt() in 0..100
                DynType.JSON -> true
            }
        if (!correctType || !valid(node, definition.schema)) {
            throw DynPropertyException("INVALID_VALUE")
        }
        return node
    }

    private fun valid(
        value: JsonNode,
        schema: JsonNode,
    ): Boolean {
        val type = schema.path("type").asText()
        val typeMatches =
            when (type) {
                "boolean" -> value.isBoolean
                "string" -> value.isTextual
                "integer" -> value.isIntegralNumber && value.canConvertToInt()
                "number" -> value.isNumber
                "object" -> value.isObject
                "array" -> value.isArray
                "" -> true
                else -> false
            }
        if (!typeMatches) {
            return false
        }
        if (value.isNumber &&
            (
                schema.has("minimum") &&
                    value.asDouble() < schema["minimum"].asDouble() ||
                    schema.has("maximum") &&
                    value.asDouble() > schema["maximum"].asDouble()
            )
        ) {
            return false
        }
        if (value.isTextual) {
            if (schema.has("maxLength") && value.asText().length > schema["maxLength"].asInt()) {
                return false
            }
            if (schema.has("pattern") && !Regex(schema["pattern"].asText()).matches(value.asText())) {
                return false
            }
            try {
                when (schema.path("format").asText()) {
                    "date-time" -> Instant.parse(value.asText())
                    "duration" -> {
                        val duration = Duration.parse(value.asText())
                        if (duration.isNegative || duration.isZero) {
                            return false
                        }
                    }
                    "email" ->
                        if (value.asText().isNotEmpty() && !Regex("^[^\\s@<>]+@[^\\s@<>]+\\.[^\\s@<>]+$").matches(value.asText())) {
                            return false
                        }
                }
            } catch (exception: DateTimeParseException) {
                return false
            }
        }
        if (value.isObject && schema.has("properties")) {
            val names =
                StreamSupport
                    .stream(
                        Spliterators.spliteratorUnknownSize(schema["properties"].fieldNames(), 0),
                        false,
                    ).toList()
            if (!names.stream().allMatch { value.has(it) && valid(value[it], schema["properties"][it]) }) {
                return false
            }
        }
        if (value.isArray) {
            if (schema.has("maxItems") && value.size() > schema["maxItems"].asInt()) {
                return false
            }
            if (schema.has("items") && !StreamSupport.stream(value.spliterator(), false).allMatch { valid(it, schema["items"]) }) {
                return false
            }
        }
        if (value.isObject && schema.has("additionalProperties")) {
            val additional = schema["additionalProperties"]
            val fields = StreamSupport.stream(Spliterators.spliteratorUnknownSize(value.fieldNames(), 0), false)
            if (!fields.filter { !schema.path("properties").has(it) }.allMatch {
                    if (additional.isBoolean) additional.asBoolean() else valid(value[it], additional)
                }
            ) {
                return false
            }
        }
        return true
    }
}
