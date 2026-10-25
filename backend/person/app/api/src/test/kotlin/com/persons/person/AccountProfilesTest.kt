package com.persons.person

import com.persons.id.client.configuration.IdMainClientFactory
import com.persons.id.client.configuration.properties.IdClientProperties
import com.persons.person.component.AccountProfiles
import com.persons.person.configuration.properties.InternalProperties
import com.persons.person.exception.impl.NotFoundException
import com.persons.person.exception.impl.UnavailableException
import com.sun.net.httpserver.HttpServer
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import java.net.InetSocketAddress
import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger
import java.util.stream.IntStream

private const val SERVICE_SECRET = "tests-internal-jwt-secret-at-least-thirty-two-characters"
private const val BATCH_COUNT = 201

class AccountProfilesTest {
    private val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0).also { it.start() }
    private val profiles = AccountProfiles(
        IdMainClientFactory(IdClientProperties("http://127.0.0.1:${server.address.port}")),
        InternalProperties(SERVICE_SECRET),
    )

    @AfterEach
    fun close() {
        server.stop(0)
    }

    @Test
    fun `batch lookup is bounded and does not perform one request per author`() {
        val calls = AtomicInteger()
        server.createContext("/internal/v1/users/profiles") { exchange ->
            assertThat(exchange.requestHeaders.getFirst("X-Service-Authorization")).startsWith("Bearer ")
            assertThat(exchange.requestHeaders.getFirst("Authorization")).isNull()
            val ids = com.fasterxml.jackson.module.kotlin.jacksonObjectMapper().readTree(exchange.requestBody)
            assertThat(ids.size()).isBetween(1, 100)
            calls.incrementAndGet()
            val response = "[]".toByteArray()
            exchange.responseHeaders.set("Content-Type", "application/json")
            exchange.sendResponseHeaders(200, response.size.toLong())
            exchange.responseBody.use { it.write(response) }
        }
        val ids = IntStream.range(0, BATCH_COUNT).mapToObj { UUID.randomUUID() }.toList().toSet()
        assertThat(profiles.profiles(ids)).isEmpty()
        assertThat(calls.get()).isEqualTo(3)
        assertThat(profiles.profiles(emptySet())).isEmpty()
        assertThat(calls.get()).isEqualTo(3)
    }

    @Test
    fun `generated client reads binary avatars and distinguishes missing avatars from upstream failure`() {
        val id = UUID.randomUUID()
        val status = AtomicInteger(200)
        val picture = byteArrayOf(1, 2, 3)
        server.createContext("/internal/v1/users/$id/avatar") { exchange ->
            exchange.responseHeaders.set("Content-Type", "image/jpeg")
            exchange.sendResponseHeaders(status.get(), picture.size.toLong())
            exchange.responseBody.use { it.write(picture) }
        }
        assertThat(profiles.avatar(id)).isEqualTo(picture)
        status.set(404)
        assertThatThrownBy { profiles.avatar(id) }.isInstanceOf(NotFoundException::class.java)
        status.set(503)
        assertThatThrownBy { profiles.avatar(id) }.isInstanceOf(UnavailableException::class.java)
    }
}
