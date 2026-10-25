package com.persons.gateway

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.persons.gateway.component.RoutePolicy
import org.assertj.core.api.Assertions.assertThatCode
import org.junit.jupiter.api.Test
import java.nio.file.Files
import java.nio.file.Path

private val WRITE_METHODS = setOf("post", "put", "patch", "delete")

class RoutePolicyContractTest {
    @Test
    fun `every declared Person write has a gateway restriction policy`() {
        val directory = Path.of("../person/app/contract/api/schema")
        val mapper = ObjectMapper(YAMLFactory())
        val api = mapper.readTree(Files.readString(directory.resolve("api.yaml")))
        val policy = RoutePolicy()
        api["paths"].properties().stream().forEach { route ->
            val reference = route.value["\$ref"].asText()
            val document = mapper.readTree(Files.readString(directory.resolve(reference.substringBefore('#'))))
            val definition = document.at(reference.substringAfter('#'))
            definition.properties().stream().filter { it.key in WRITE_METHODS }.forEach { operation ->
                assertThatCode { policy.scope(operation.key.uppercase(), route.key) }
                    .describedAs("${operation.key} ${route.key}").doesNotThrowAnyException()
            }
        }
    }
}
