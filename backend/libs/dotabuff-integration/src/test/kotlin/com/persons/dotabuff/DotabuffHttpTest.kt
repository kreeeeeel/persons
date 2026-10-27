package com.persons.dotabuff

import com.persons.dotabuff.component.DotabuffHttp
import com.persons.dotabuff.component.HttpSteamAccountResolver
import com.persons.dotabuff.configuration.DotabuffProperties
import com.persons.dotabuff.exception.DotabuffException
import com.sun.net.httpserver.HttpServer
import org.apache.hc.client5.http.DnsResolver
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.URI
import java.time.Duration
import java.util.concurrent.atomic.AtomicInteger

class DotabuffHttpTest {
    @Test
    fun `retries another DNS address when TCP connects but the provider closes the response`() {
        val good = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        val bad = HttpServer.create(InetSocketAddress("127.0.0.2", good.address.port), 0)
        val failures = AtomicInteger()
        good.createContext("/history") { exchange ->
            val body = "recovered".toByteArray()
            exchange.sendResponseHeaders(200, body.size.toLong())
            exchange.responseBody.use { it.write(body) }
            exchange.close()
        }
        bad.createContext("/history") { exchange ->
            failures.incrementAndGet()
            exchange.close()
        }
        good.start()
        bad.start()
        try {
            val resolver = Mockito.mock(DnsResolver::class.java, Mockito.CALLS_REAL_METHODS)
            Mockito.`when`(resolver.resolve("provider.test")).thenReturn(
                arrayOf(InetAddress.getByName("127.0.0.2"), InetAddress.getByName("127.0.0.1")),
            )
            DotabuffHttp(
                DotabuffProperties(
                    openDotaBaseUrl = URI("http://provider.test:${good.address.port}"),
                    requestInterval = Duration.ZERO,
                ),
                resolver,
            ).use { http -> assertThat(http.opendota("/history")).isEqualTo("recovered") }
            assertThat(failures.get()).isEqualTo(1)
        } finally {
            bad.stop(0)
            good.stop(0)
        }
    }

    @Test
    fun `tries the next DNS address when the first provider endpoint is unavailable`() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        val body = """{"matches":[123]}"""
        server.createContext("/history") { exchange ->
            val bytes = body.toByteArray()
            exchange.sendResponseHeaders(200, bytes.size.toLong())
            exchange.responseBody.use { it.write(bytes) }
            exchange.close()
        }
        server.start()
        try {
            val resolver = Mockito.mock(DnsResolver::class.java, Mockito.CALLS_REAL_METHODS)
            Mockito.`when`(resolver.resolve("provider.test")).thenReturn(
                arrayOf(InetAddress.getByName("127.0.0.2"), InetAddress.getByName("127.0.0.1")),
            )
            DotabuffHttp(
                DotabuffProperties(
                    openDotaBaseUrl = URI("http://provider.test:${server.address.port}"),
                    requestInterval = Duration.ZERO,
                ),
                resolver,
            ).use { http -> assertThat(http.opendota("/history")).isEqualTo(body) }
        } finally {
            server.stop(0)
        }
    }

    @Test
    fun `does not follow redirects or treat provider failures as empty history and honors retry-after`() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/matches") { exchange ->
            exchange.responseHeaders.add("Retry-After", "120")
            exchange.sendResponseHeaders(429, -1)
            exchange.close()
        }
        server.createContext("/redirect") { exchange ->
            exchange.responseHeaders.add("Location", "/matches")
            exchange.sendResponseHeaders(302, -1)
            exchange.close()
        }
        server.start()
        try {
            val http =
                DotabuffHttp(
                    DotabuffProperties(
                        baseUrl = URI("http://127.0.0.1:${server.address.port}"),
                        requestInterval = Duration.ZERO,
                    ),
                )
            assertThatThrownBy { http.dota("/matches") }.isInstanceOfSatisfying(DotabuffException::class.java) {
                assertThat(it.code).isEqualTo("HTTP_429")
                assertThat(it.retryAfter).isEqualTo(Duration.ofSeconds(120))
            }
            assertThatThrownBy { http.dota("/redirect") }.isInstanceOfSatisfying(DotabuffException::class.java) {
                assertThat(it.code).isEqualTo("HTTP_302")
            }
            val resolver = HttpSteamAccountResolver(http)
            assertThat(resolver.resolve("https://steamcommunity.com/profiles/76561197960265770")).isEqualTo(42)
            listOf("https://evil.test/profiles/1", "http://steamcommunity.com/id/a", "not a uri").stream().forEach {
                assertThatThrownBy { resolver.resolve(it) }.isInstanceOf(DotabuffException::class.java)
            }
        } finally {
            server.stop(0)
        }
    }
}
