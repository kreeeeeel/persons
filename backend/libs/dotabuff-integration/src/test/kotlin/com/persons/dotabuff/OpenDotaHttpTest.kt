package com.persons.dotabuff

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.dotabuff.component.DotabuffHttp
import com.persons.dotabuff.component.HttpOpenDotaClient
import com.persons.dotabuff.component.OpenDotaParser
import com.persons.dotabuff.configuration.DotabuffProperties
import com.persons.dotabuff.exception.DotabuffException
import com.sun.net.httpserver.HttpServer
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.net.InetSocketAddress
import java.net.URI
import java.time.Duration
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicInteger

class OpenDotaHttpTest {
    @Test
    fun `recovers a dropped provider connection`() {
        val attempts = AtomicInteger()
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/api/players/42/matches") { exchange ->
            if (attempts.incrementAndGet() < 3) {
                exchange.close()
            } else {
                val bytes = "[]".toByteArray()
                exchange.sendResponseHeaders(200, bytes.size.toLong())
                exchange.responseBody.use { it.write(bytes) }
                exchange.close()
            }
        }
        server.start()
        try {
            val client =
                HttpOpenDotaClient(
                    DotabuffHttp(
                        DotabuffProperties(
                            openDotaBaseUrl = URI("http://127.0.0.1:${server.address.port}"),
                            requestInterval = Duration.ZERO,
                        ),
                    ),
                    OpenDotaParser(ObjectMapper()),
                )
            assertThat(client.matches(42, 1).matches).isEmpty()
            assertThat(attempts.get()).isEqualTo(3)
        } finally {
            server.stop(0)
        }
    }

    @Test
    fun `uses the public API with bounded pagination and preserves HTTP denial`() {
        val requested = CopyOnWriteArrayList<String>()
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/api/players/42/matches") { exchange ->
            requested.add(exchange.requestURI.toString())
            if (exchange.requestURI.query.contains("offset=200")) {
                exchange.responseHeaders.add("Retry-After", "60")
                exchange.sendResponseHeaders(429, -1)
            } else {
                val bytes = "[]".toByteArray()
                exchange.sendResponseHeaders(200, bytes.size.toLong())
                exchange.responseBody.use { it.write(bytes) }
            }
            exchange.close()
        }
        server.start()
        try {
            val client =
                HttpOpenDotaClient(
                    DotabuffHttp(
                        DotabuffProperties(
                            openDotaBaseUrl = URI("http://127.0.0.1:${server.address.port}"),
                            requestInterval = Duration.ZERO,
                        ),
                    ),
                    OpenDotaParser(ObjectMapper()),
                )
            assertThat(client.matches(42, 2).matches).isEmpty()
            assertThat(requested).containsExactly("/api/players/42/matches?limit=100&offset=100&significant=0")
            assertThatThrownBy { client.matches(42, 3) }.isInstanceOfSatisfying(DotabuffException::class.java) {
                assertThat(it.code).isEqualTo("HTTP_429")
                assertThat(it.retryAfter).isEqualTo(Duration.ofSeconds(60))
            }
            assertThatThrownBy { client.matches(42, 0) }.isInstanceOf(DotabuffException::class.java)
            assertThat(requested).hasSize(2)
        } finally {
            server.stop(0)
        }
    }
}
