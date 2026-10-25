package com.persons.leetify

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.leetify.component.HttpLeetifyClient
import com.persons.leetify.component.LeetifyHttp
import com.persons.leetify.component.LeetifyParser
import com.persons.leetify.configuration.LeetifyProperties
import com.sun.net.httpserver.HttpServer
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import java.net.InetSocketAddress
import java.net.URI
import java.time.Duration
import java.util.UUID
import java.util.concurrent.CopyOnWriteArrayList

private const val STEAM_ID = "76561197960265770"

class HttpLeetifyClientTest {
    private val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)

    @AfterEach
    fun close() {
        server.stop(0)
    }

    @Test
    fun `uses canonical matchmaking source when looking up competitive or wingman share codes`() {
        val paths = CopyOnWriteArrayList<String>()
        val mapper = ObjectMapper()
        val fixture = javaClass.getResourceAsStream("/history.json")
        if (fixture == null) {
            throw IllegalStateException("Missing history fixture")
        }
        val match = fixture.bufferedReader().use { mapper.readTree(it)[0] }
        val bytes = match.toString().toByteArray()
        server.createContext("/v2/matches/") { exchange ->
            paths.add(exchange.requestURI.rawPath)
            exchange.sendResponseHeaders(200, bytes.size.toLong())
            exchange.responseBody.use { it.write(bytes) }
        }
        server.start()
        val client =
            HttpLeetifyClient(
                LeetifyHttp(
                    LeetifyProperties(
                        baseUrl = URI("http://127.0.0.1:${server.address.port}"),
                        requestInterval = Duration.ZERO,
                    ),
                ),
                LeetifyParser(mapper),
            )

        listOf("matchmaking", "matchmaking_competitive", "matchmaking_wingman", "faceit")
            .stream()
            .forEachOrdered { source ->
                assertThat(client.match(source, "CSGO-test/code", STEAM_ID).matchId)
                    .isEqualTo(UUID.fromString("00000000-0000-4000-8000-000000000001"))
            }

        assertThat(paths).containsExactly(
            "/v2/matches/matchmaking/CSGO-test%2Fcode",
            "/v2/matches/matchmaking/CSGO-test%2Fcode",
            "/v2/matches/matchmaking/CSGO-test%2Fcode",
            "/v2/matches/faceit/CSGO-test%2Fcode",
        )
    }
}
