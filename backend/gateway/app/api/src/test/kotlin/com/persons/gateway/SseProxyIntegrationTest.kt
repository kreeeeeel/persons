package com.persons.gateway

import com.persons.requestobservability.SignedJwt
import org.assertj.core.api.Assertions.assertThat
import org.awaitility.Awaitility.await
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import java.io.InputStream
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit
import java.util.stream.IntStream

private const val INTERNAL_SECRET = "tests-internal-secret-at-least-thirty-two-characters"
private const val GATEWAY_SECRET = "tests-gateway-secret-at-least-thirty-two-characters"
private const val STREAMS = 12

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = ["server.tomcat.threads.max=4", "server.tomcat.threads.min-spare=1"],
)
@ActiveProfiles("tests")
class SseProxyIntegrationTest {
    @LocalServerPort private var port: Int = 0
    private val client = HttpClient.newHttpClient()

    @Test
    fun `SSE flushes before EOF without occupying servlet threads and disconnect closes upstream`() {
        val connections = IntStream.range(0, STREAMS).mapToObj {
            client.sendAsync(
                builder("/person/v1/dynamic-properties/events").build(),
                HttpResponse.BodyHandlers.ofInputStream(),
            )
        }.toList()
        val responses = connections.stream().map { it.get(10, TimeUnit.SECONDS) }.toList()
        try {
            assertThat(responses).allSatisfy { response ->
                assertThat(response.statusCode()).isEqualTo(200)
                assertThat(response.headers().firstValue("Content-Type")).hasValue("text/event-stream")
                val initial = CompletableFuture.supplyAsync { response.body().readNBytes(10) }
                    .get(3, TimeUnit.SECONDS)
                assertThat(String(initial)).isEqualTo("data: []\n\n")
            }
            assertThat(events.activeStreams).isEqualTo(STREAMS)

            val ordinary = IntStream.range(0, 16).mapToObj { index ->
                val path = if (index % 2 == 0) "/actuator/health" else "/person/v1/persons/directory"
                client.sendAsync(builder(path).build(), HttpResponse.BodyHandlers.ofString())
            }.toList()
            ordinary.stream().forEach { response ->
                assertThat(response.get(5, TimeUnit.SECONDS).statusCode()).isEqualTo(200)
            }
        } finally {
            responses.stream().map { it.body() }.forEach(InputStream::close)
        }
        await().atMost(Duration.ofSeconds(5)).until { events.activeStreams == 0 }
    }

    private fun builder(path: String): HttpRequest.Builder = HttpRequest.newBuilder(URI("http://127.0.0.1:$port$path"))
        .timeout(Duration.ofSeconds(10))
        .header("X-Service-Authorization", "Bearer ${SignedJwt(INTERNAL_SECRET).service("gateway-tests")}")
        .header("Authorization", "Bearer user")

    companion object {
        private val upstreams = GatewayTestUpstreams()
        private val events = SseTestUpstream().also { it.start() }

        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) {
            registry.add("project.internal.jwt-secret") { INTERNAL_SECRET }
            registry.add("project.gateway.jwt-secret") { GATEWAY_SECRET }
            registry.add("project.gateway.id-uri") { upstreams.idUri }
            registry.add("project.gateway.person-uri") { events.uri }
            registry.add("project.id-client.base-uri") { upstreams.idUri }
            registry.add("project.restrictions-client.base-uri") { upstreams.restrictionsUri }
        }

        @JvmStatic
        @AfterAll
        fun stop() {
            events.stop()
            upstreams.stop()
        }
    }
}
