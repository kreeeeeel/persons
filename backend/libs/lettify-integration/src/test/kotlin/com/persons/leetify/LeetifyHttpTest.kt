package com.persons.leetify

import com.persons.leetify.component.LeetifyHttp
import com.persons.leetify.configuration.LeetifyProperties
import com.sun.net.httpserver.HttpServer
import org.apache.hc.client5.http.DnsResolver
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.URI
import java.time.Duration
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference

class LeetifyHttpTest {
    private val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)

    @AfterEach
    fun close() {
        server.stop(0)
    }

    @Test
    fun `uses another resolved provider address after a failed connection`() {
        val body = """{"matches":[123]}"""
        server.createContext("/history") { exchange ->
            val bytes = body.toByteArray()
            exchange.sendResponseHeaders(200, bytes.size.toLong())
            exchange.responseBody.use { it.write(bytes) }
            exchange.close()
        }
        server.start()
        val resolver = Mockito.mock(DnsResolver::class.java, Mockito.CALLS_REAL_METHODS)
        Mockito.`when`(resolver.resolve("provider.test")).thenReturn(
            arrayOf(InetAddress.getByName("127.0.0.2"), InetAddress.getByName("127.0.0.1")),
        )
        LeetifyHttp(
            LeetifyProperties(
                baseUrl = URI("http://provider.test:${server.address.port}"),
                requestInterval = Duration.ZERO,
            ),
            resolver,
        ).use { http -> assertThat(http.get("/history")).isEqualTo(body) }
    }

    @Test
    fun `sends server key and preserves rate limiting retry without following redirects`() {
        val key = AtomicReference<String>()
        server.createContext("/limited") { exchange ->
            key.set(exchange.requestHeaders.getFirst("_leetify_key"))
            exchange.responseHeaders.add("Retry-After", "120")
            exchange.sendResponseHeaders(429, -1)
            exchange.close()
        }
        server.createContext("/redirect") { exchange ->
            exchange.responseHeaders.add("Location", "/limited")
            exchange.sendResponseHeaders(302, -1)
            exchange.close()
        }
        server.start()
        val http = client()
        assertThatThrownBy { http.get("/limited") }
            .hasMessageContaining("HTTP_429")
            .hasFieldOrPropertyWithValue("retryAfter", Duration.ofSeconds(120))
        assertThat(key.get()).isEqualTo("local-test-key")
        assertThatThrownBy { http.get("/redirect") }.hasMessageContaining("HTTP_302")
    }

    @Test
    fun `recovers a transient connection failure without returning a fake empty response`() {
        val attempts = AtomicInteger()
        server.createContext("/interrupted") { exchange ->
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
        assertThat(client().get("/interrupted")).isEqualTo("[]")
        assertThat(attempts.get()).isEqualTo(3)
    }

    @Test
    fun `bounds successful response size and rejects protocol-relative paths`() {
        server.createContext("/large") { exchange ->
            val bytes = "x".repeat(1025).toByteArray()
            exchange.sendResponseHeaders(200, bytes.size.toLong())
            exchange.responseBody.use { it.write(bytes) }
        }
        server.start()
        assertThatThrownBy { client().get("/large") }.hasMessageContaining("RESPONSE_TOO_LARGE")
        assertThatThrownBy { client().get("//example.test") }.hasMessageContaining("INVALID_CONFIGURATION")
    }

    private fun client(): LeetifyHttp =
        LeetifyHttp(
            LeetifyProperties(
                baseUrl = URI("http://127.0.0.1:${server.address.port}"),
                apiKey = "local-test-key",
                requestInterval = Duration.ZERO,
                maxResponseBytes = 1024,
            ),
        )
}
