package com.persons.gateway

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.requestobservability.SignedJwt
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.security.MessageDigest
import java.time.Duration
import java.util.UUID

private const val INTERNAL_SECRET = "tests-internal-secret-at-least-thirty-two-characters"
private const val GATEWAY_SECRET = "tests-gateway-secret-at-least-thirty-two-characters"

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("production")
class GatewayIntegrationTest {
    @LocalServerPort private var port: Int = 0
    private val client = HttpClient.newHttpClient()
    private val json = ObjectMapper()

    @BeforeEach
    fun prepare() {
        upstreams.reset()
    }

    @Test
    fun `signed frontend registrations are forwarded through the gateway`() {
        val response = request("PUT", "/person/v1/dynamic-properties/registrations/frontend-person", "[]".toByteArray())
        assertThat(response.statusCode()).isEqualTo(200)
        assertThat(upstreams.forwarded).hasValue(1)
    }

    @Test
    fun `all scoped actions are denied before domain service is contacted`() {
        val person = UUID.randomUUID()
        val paths = mapOf(
            "COMMENTS" to ("POST" to "/v1/persons/$person/comments"),
            "RATINGS" to ("PUT" to "/v1/persons/$person/rating"),
            "LOANS" to ("POST" to "/v1/persons/$person/credit"),
            "MEDIA" to ("POST" to "/v1/persons/$person/media"),
            "PROFILE" to ("PATCH" to "/v1/persons/$person"),
            "REACTIONS" to ("PUT" to "/v1/media/$person/reaction"),
        )
        paths.entries.stream().forEach { (scope, route) ->
            upstreams.ban(scope)
            val response = request(route.first, "/person${route.second}")
            assertThat(response.statusCode()).describedAs(scope).isEqualTo(403)
            assertThat(json.readTree(response.body())["scope"].asText()).isEqualTo(scope)
            assertThat(json.readTree(response.body())["restriction"]["reason"].asText()).isEqualTo("Pause")
        }
        assertThat(upstreams.forwarded).hasValue(0)
    }

    @Test
    fun `account ban denies reads while access explanation and signout remain accessible`() {
        upstreams.ban("ACCOUNT")
        assertThat(request("GET", "/person/v1/persons/search?query=test").statusCode()).isEqualTo(403)
        val state = request("GET", "/person/v1/access")
        assertThat(state.statusCode()).isEqualTo(200)
        assertThat(json.readTree(state.body())["restriction"]["scopes"][0].asText()).isEqualTo("ACCOUNT")
        assertThat(request("POST", "/id/v1/sessions/refresh").statusCode()).isEqualTo(200)
        assertThat(request("GET", "/id/v1/me").statusCode()).isEqualTo(200)
        assertThat(request("DELETE", "/id/v1/sessions/${UUID.randomUUID()}").statusCode()).isEqualTo(200)
        assertThat(upstreams.forwarded).hasValue(0)
    }

    @Test
    fun `missing internal authorization and internal ID paths are rejected`() {
        val target = URI("http://127.0.0.1:$port/person/v1/persons/search")
        val unauthenticated = HttpRequest.newBuilder(target).timeout(Duration.ofSeconds(60)).GET().build()
        assertThat(client.send(unauthenticated, HttpResponse.BodyHandlers.ofByteArray()).statusCode()).isEqualTo(401)
        assertThat(request("GET", "/id/internal/v1/admin/users").statusCode()).isEqualTo(401)
        assertThat(upstreams.forwarded).hasValue(0)
    }

    @Test
    fun `encoded internal paths cannot bypass policy while escaped search queries remain valid`() {
        assertThat(request("GET", "/id/%69nternal/v1/admin/users").statusCode()).isEqualTo(400)
        assertThat(upstreams.forwarded).hasValue(0)
        assertThat(request("GET", "/person/v1/persons/search?query=%D0%9A%D1%80%D0%B5%D0%BB").statusCode())
            .isEqualTo(200)
    }

    @Test
    fun `failed identity and restriction lookups fail closed`() {
        upstreams.unavailable = true
        assertThat(request("GET", "/person/v1/persons/search").statusCode()).isEqualTo(503)
        upstreams.unavailable = false
        upstreams.idUnavailable = true
        assertThat(request("GET", "/person/v1/persons/search").statusCode()).isEqualTo(503)
        assertThat(upstreams.forwarded).hasValue(0)
    }

    @Test
    fun `cold policy reads can complete beyond the previous three second limit`() {
        upstreams.restrictionReadDelay = Duration.ofMillis(3200)
        assertThat(request("GET", "/person/v1/persons/search?q=test").statusCode()).isEqualTo(200)
        assertThat(upstreams.forwarded).hasValue(1)
    }

    @Test
    fun `setting and revoking restrictions allow time for owner identity checks`() {
        upstreams.restrictionMutationDelay = Duration.ofMillis(5500)
        val path = "/person/v1/admin/users/$USER_ID/restriction"
        val body = """{"scopes":["COMMENTS"],"reason":"A delayed restriction"}"""
        val setting = builder(path, "admin").header("Content-Type", "application/json")
            .PUT(HttpRequest.BodyPublishers.ofString(body)).build()
        assertThat(client.send(setting, HttpResponse.BodyHandlers.ofByteArray()).statusCode()).isEqualTo(200)
        assertThat(upstreams.restrictions).containsKey(USER_ID)
        val revoking = builder(path, "admin").DELETE().build()
        assertThat(client.send(revoking, HttpResponse.BodyHandlers.ofByteArray()).statusCode()).isEqualTo(204)
        assertThat(upstreams.restrictions).doesNotContainKey(USER_ID)
        assertThat(upstreams.forwarded).hasValue(0)
    }

    @Test
    fun `unknown writes are denied and newly revoked policy permits forwarding`() {
        assertThat(request("POST", "/person/v1/unclassified-action").statusCode()).isEqualTo(403)
        upstreams.ban("COMMENTS")
        val path = "/person/v1/persons/${UUID.randomUUID()}/comments"
        assertThat(request("POST", path).statusCode()).isEqualTo(403)
        upstreams.restrictions.clear()
        assertThat(request("POST", path).statusCode()).isEqualTo(200)
        assertThat(upstreams.forwarded).hasValue(1)
    }

    @Test
    fun `large multipart uploads stream unchanged and forged gateway credentials are replaced`() {
        val bytes = ByteArray(3 * 1024 * 1024) { (it % 251).toByte() }
        val request = builder("/person/v1/persons/${UUID.randomUUID()}/media")
            .header("Content-Type", "multipart/form-data; boundary=test-boundary")
            .header("X-Gateway-Authorization", "Bearer forged")
            .POST(HttpRequest.BodyPublishers.ofInputStream { bytes.inputStream() }).build()
        val result = client.send(request, HttpResponse.BodyHandlers.ofByteArray())
        assertThat(result.statusCode()).isEqualTo(200)
        val digest = MessageDigest.getInstance("SHA-256")
        assertThat(digest.digest(upstreams.lastBody)).containsExactly(*digest.digest(bytes))
        val token = upstreams.lastGatewayHeader.removePrefix("Bearer ")
        assertThat(SignedJwt(GATEWAY_SECRET).verify(token, "persons-person", "gateway")).isNotNull()
    }

    @Test
    fun `video byte ranges retain response status headers and binary bytes`() {
        val request = builder("/person/v1/media/${UUID.randomUUID()}/content")
            .header("Range", "bytes=0-3").GET().build()
        val result = client.send(request, HttpResponse.BodyHandlers.ofByteArray())
        assertThat(result.statusCode()).isEqualTo(206)
        assertThat(result.headers().firstValue("Content-Range")).hasValue("bytes 0-3/6")
        assertThat(result.body()).containsExactly(0, 1, 2, 3)
    }

    @Test
    fun `administration compatibility routes enforce role and use restrictions owner`() {
        val path = "/person/v1/admin/users/$USER_ID/restriction"
        val body = """{"scopes":["COMMENTS"],"reason":"A test restriction"}""".toByteArray()
        assertThat(request("PUT", path, body).statusCode()).isEqualTo(403)
        val request = builder(path, "admin").header("Content-Type", "application/json")
            .PUT(HttpRequest.BodyPublishers.ofByteArray(body)).build()
        val result = client.send(request, HttpResponse.BodyHandlers.ofByteArray())
        assertThat(result.statusCode()).isEqualTo(200)
        assertThat(json.readTree(result.body())["userId"].asText()).isEqualTo(USER_ID.toString())
        assertThat(upstreams.restrictions).containsKey(USER_ID)
        assertThat(upstreams.forwarded).hasValue(0)
    }

    @Test
    fun `account access compatibility delegates role and status together to the policy owner`() {
        val request = builder("/person/v1/admin/users/$USER_ID/access", "admin")
            .header("Content-Type", "application/json")
            .PUT(HttpRequest.BodyPublishers.ofString("""{"role":"USER","status":"ACTIVE"}""")).build()
        val result = client.send(request, HttpResponse.BodyHandlers.ofByteArray())
        assertThat(result.statusCode()).isEqualTo(200)
        assertThat(json.readTree(result.body())["id"].asText()).isEqualTo(USER_ID.toString())
        assertThat(json.readTree(result.body())["role"].asText()).isEqualTo("USER")
        assertThat(upstreams.forwarded).hasValue(0)
    }

    @Test
    fun `account administration requires a signed-in administrator`() {
        val path = "/person/v1/admin/users"
        val anonymous = HttpRequest.newBuilder(URI("http://127.0.0.1:$port$path"))
            .timeout(Duration.ofSeconds(60))
            .header("X-Service-Authorization", "Bearer ${SignedJwt(INTERNAL_SECRET).service("gateway-tests")}")
            .GET().build()
        assertThat(client.send(anonymous, HttpResponse.BodyHandlers.ofByteArray()).statusCode()).isEqualTo(401)
        assertThat(request("GET", path).statusCode()).isEqualTo(403)
        assertThat(request("DELETE", "$path/$USER_ID/sessions").statusCode()).isEqualTo(403)
        assertThat(upstreams.forwarded).hasValue(0)
    }

    @Test
    fun `cold administrator lists retain the ID response beyond five seconds`() {
        upstreams.idAdminDelay = Duration.ofMillis(5500)
        val request = builder("/person/v1/admin/users?page=0&size=5", "admin").GET().build()
        val response = client.send(request, HttpResponse.BodyHandlers.ofByteArray())
        assertThat(response.statusCode()).isEqualTo(200)
        assertThat(json.readTree(response.body())["size"].asInt()).isEqualTo(5)
        assertThat(upstreams.forwarded).hasValue(0)
    }

    @Test
    fun `administrator avatar requests use the protected gateway route and return private JPEG bytes`() {
        val request = builder("/person/v1/admin/users/$USER_ID/avatar", "admin").GET().build()
        val response = client.send(request, HttpResponse.BodyHandlers.ofByteArray())

        assertThat(response.statusCode()).isEqualTo(200)
        assertThat(response.headers().firstValue("Content-Type")).hasValue("image/jpeg")
        assertThat(response.headers().firstValue("Cache-Control")).hasValue("private, no-store")
        assertThat(response.headers().firstValue("X-Content-Type-Options")).hasValue("nosniff")
        assertThat(response.body()).containsExactly(0xff.toByte(), 0xd8.toByte(), 1, 2, 0xff.toByte(), 0xd9.toByte())
        assertThat(upstreams.avatarRequests).hasValue(1)
        val token = upstreams.lastAvatarServiceHeader.removePrefix("Bearer ")
        assertThat(SignedJwt(INTERNAL_SECRET).verify(token, "persons-internal", "service")).isNotNull()
        assertThat(upstreams.forwarded).hasValue(0)
    }

    @Test
    fun `avatar route denies anonymous users regular users and direct access to ID internals`() {
        val path = "/person/v1/admin/users/$USER_ID/avatar"
        val anonymous = HttpRequest.newBuilder(URI("http://127.0.0.1:$port$path"))
            .header("X-Service-Authorization", "Bearer ${SignedJwt(INTERNAL_SECRET).service("gateway-tests")}")
            .GET().build()

        assertThat(client.send(anonymous, HttpResponse.BodyHandlers.ofByteArray()).statusCode()).isEqualTo(401)
        assertThat(request("GET", path).statusCode()).isEqualTo(403)
        val internal = builder("/id/internal/v1/users/$USER_ID/avatar", "admin").GET().build()
        assertThat(client.send(internal, HttpResponse.BodyHandlers.ofByteArray()).statusCode()).isEqualTo(401)
        assertThat(upstreams.avatarRequests).hasValue(0)
    }

    @Test
    fun `missing account avatars retain their 404 response for initials fallback`() {
        upstreams.avatarStatus = 404
        val request = builder("/person/v1/admin/users/$USER_ID/avatar", "admin").GET().build()
        val response = client.send(request, HttpResponse.BodyHandlers.ofByteArray())

        assertThat(response.statusCode()).isEqualTo(404)
        assertThat(json.readTree(response.body())["code"].asText()).isEqualTo("AVATAR_NOT_FOUND")
    }

    private fun request(method: String, path: String, body: ByteArray = "{}".toByteArray()): HttpResponse<ByteArray> =
        client.send(
            builder(path).header("Content-Type", "application/json")
                .method(method, HttpRequest.BodyPublishers.ofByteArray(body)).build(),
            HttpResponse.BodyHandlers.ofByteArray(),
        )

    private fun builder(path: String, user: String = "user"): HttpRequest.Builder =
        HttpRequest.newBuilder(URI("http://127.0.0.1:$port$path"))
            .timeout(Duration.ofSeconds(60))
            .header("X-Service-Authorization", "Bearer ${SignedJwt(INTERNAL_SECRET).service("gateway-tests")}")
            .header("Authorization", "Bearer $user")

    companion object {
        private val upstreams = GatewayTestUpstreams()

        @JvmStatic
        @DynamicPropertySource
        fun properties(registry: DynamicPropertyRegistry) {
            registry.add("project.internal.jwt-secret") { INTERNAL_SECRET }
            registry.add("project.gateway.jwt-secret") { GATEWAY_SECRET }
            registry.add("project.gateway.id-uri") { upstreams.idUri }
            registry.add("project.gateway.person-uri") { upstreams.personUri }
            registry.add("project.id-client.base-uri") { upstreams.idUri }
            registry.add("project.restrictions-client.base-uri") { upstreams.restrictionsUri }
        }

        @JvmStatic
        @AfterAll
        fun stop() {
            upstreams.stop()
        }
    }
}
