package com.persons.requestobservability

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.ObjectNode
import java.util.stream.StreamSupport

private const val RANGE = 0
private const val INDEX_LIMIT = 0
private const val CONTAINS = 1

class BodyRedactor(private val mapper: ObjectMapper, private val properties: ObservabilityProperties) {
    private val protected =
        listOf(
            "*password*",
            "*token*",
            "*secret*",
            "code",
            "state",
            "*binding*",
            "*verifier*",
            "grant",
            "html",
            "avatar*",
            "*authorization*",
            "cookie",
            "set-cookie",
            "referer",
        )

    fun masked(name: String, configured: List<String> = properties.maskedFields): Boolean =
        (protected + configured).stream().anyMatch { pattern ->
            val expression = pattern.split("*").stream().map { Regex.escape(it) }.toList().joinToString(".*")

            Regex("^$expression$", RegexOption.IGNORE_CASE).matches(name)
        }

    fun redact(bytes: ByteArray, contentType: String?): String {
        if (bytes.isEmpty()) {
            return ""
        }
        if (contentType?.contains("json") != true || bytes.size > properties.maxBodyBytes) {
            return "[body omitted: binary, non-JSON or above limit]"
        }

        return try {
            val tree = mapper.readTree(bytes)

            visit(tree)
            mapper.writeValueAsString(tree)
        } catch (exception: com.fasterxml.jackson.core.JacksonException) {
            "[body omitted: invalid JSON]"
        }
    }

    fun path(value: String): String {
        val parts = value.split("/")

        return java.util.stream.IntStream.range(RANGE, parts.size).mapToObj { index ->
            if (index > INDEX_LIMIT &&
                properties.maskedPathSegments.contains(parts[index - CONTAINS])
            ) {
                "[REDACTED]"
            } else {
                parts[index]
            }
        }.toList().joinToString("/")
    }

    private fun visit(node: JsonNode) {
        if (node is ObjectNode) {
            StreamSupport.stream(node.properties().spliterator(), false).forEach { entry ->
                if (masked(entry.key)) {
                    node.put(entry.key, "[REDACTED]")
                } else {
                    visit(entry.value)
                }
            }
        } else if (node.isArray) {
            StreamSupport.stream(node.spliterator(), false).forEach { visit(it) }
        }
    }
}
