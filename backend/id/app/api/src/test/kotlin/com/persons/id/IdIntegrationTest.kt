package com.persons.id

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.id.component.AvatarStorage
import com.persons.id.dao.repository.AccountRepository
import com.persons.id.dao.repository.ChallengeRepository
import com.persons.id.dao.repository.LoginAttemptRepository
import com.persons.id.dao.repository.NotificationRepository
import com.persons.id.dao.repository.SessionRepository
import com.persons.id.domain.PreparedNotification
import com.persons.id.service.NotificationService
import com.persons.idcontext.SessionVerifier
import com.persons.requestobservability.SignedJwt
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.time.Clock
import java.time.Instant

private const val GET_ARGUMENT_2 = 2
private const val GET_ARGUMENT_0 = 0
private const val IS_EQUAL_TO_1 = 1
private const val PLUS_SECONDS_61 = 61L
private const val PRINCIPALS_0 = 0
private const val PRINCIPALS_8 = 8
private const val HAS_SIZE_1 = 1
private const val RANGE_0 = 0
private const val RANGE_5 = 5
private const val IS_EQUAL_TO_5 = 5
private const val PLUS_SECONDS_601 = 601L
private const val EXPECTED_PAIR_COUNT = 2
private const val AVATAR_1: Byte = 1
private const val AVATAR_2: Byte = 2
private const val AVATAR_3: Byte = 3
private const val INVALID_CODE = "INVALID_CODE"
private const val EXPIRED_CHALLENGE = "EXPIRED_CHALLENGE"
private const val INVALID_INPUT = "INVALID_INPUT"

@SpringBootTest(properties = ["project.id.avatar-sync-delay-ms=3600000"])
@AutoConfigureMockMvc
@ActiveProfiles("tests")
class IdIntegrationTest {
    @Autowired
    private lateinit var mvc: MockMvc

    @Autowired
    private lateinit var mapper: ObjectMapper

    @Autowired
    private lateinit var accounts: AccountRepository

    @Autowired
    private lateinit var challenges: ChallengeRepository

    @Autowired
    private lateinit var sessions: SessionRepository

    @Autowired
    private lateinit var verifier: SessionVerifier

    @Autowired
    private lateinit var notifications: NotificationRepository

    @Autowired
    private lateinit var loginAttempts: LoginAttemptRepository

    @MockitoBean
    private lateinit var notifier: NotificationService

    @MockitoBean
    private lateinit var storage: AvatarStorage

    @MockitoBean
    private lateinit var clock: Clock

    private var now = Instant.parse("2026-10-07T12:00:00Z")
    private var code = ""

    @BeforeEach
    fun reset() {
        sessions.deleteAll()
        accounts.deleteAll()
        challenges.deleteAll()
        notifications.deleteAll()
        loginAttempts.deleteAll()
        now = Instant.parse("2026-10-07T12:00:00Z")
        `when`(clock.instant()).thenAnswer { now }
        `when`(notifier.prepare(anyString(), anyString(), anyString(), anyString())).thenAnswer {
            code = it.getArgument(GET_ARGUMENT_2)
            PreparedNotification(it.getArgument(GET_ARGUMENT_0), "Persons", "<strong>$code</strong>")
        }
    }

    @Test
    fun `refresh rotates a nearly expired session and converges parallel tabs on the same token`() {
        val original = register()
        val before = sessions.findAll().single()
        now = before.expiresAt.minusSeconds(86400).plusNanos(999999999)
        fun refresh(token: String): String = mapper.readTree(
            mvc.post("/v1/sessions/refresh") { header("Authorization", "Bearer $token") }
                .andExpect { status { isOk() } }.andReturn().response.contentAsString,
        ).path("token").asText()

        val results = java.util.stream.IntStream.range(0, 4).parallel().mapToObj { refresh(original) }.toList()
        assertThat(results.distinct()).hasSize(1)
        val renewed = results.first()
        assertThat(renewed).isNotEqualTo(original)
        assertThat(refresh(original)).isEqualTo(renewed)
        assertThat(refresh(renewed)).isEqualTo(renewed)
        assertThat(sessions.count()).isEqualTo(1)
        assertThat(sessions.findAll().single().id).isEqualTo(before.id)
        assertThat(sessions.findAll().single().expiresAt).isAfter(before.expiresAt)
        assertThat(sessions.findAll().single().tokenIssuedAt.nano).isZero()
        assertThat(sessions.findAll().single().expiresAt.nano).isZero()
        mvc.get("/v1/me") { header("Authorization", "Bearer $original") }.andExpect { status { isOk() } }
        now = now.plusSeconds(61)
        mvc.get("/v1/me") { header("Authorization", "Bearer $original") }.andExpect { status { isUnauthorized() } }
        mvc.get("/v1/me") { header("Authorization", "Bearer $renewed") }.andExpect { status { isOk() } }
        mvc.delete("/v1/sessions/${before.id}") { header("Authorization", "Bearer $renewed") }
            .andExpect { status { isNoContent() } }
        mvc.post("/v1/sessions/refresh") { header("Authorization", "Bearer $renewed") }
            .andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `JWT timestamps retain exact precision when the database rounds fractional seconds`() {
        now = now.plusNanos(999999999)
        register()
        val session = sessions.findAll().single()
        assertThat(session.tokenIssuedAt.nano).isZero()
        assertThat(session.expiresAt.nano).isZero()
    }

    @Test
    fun `refresh preserves a fresh token and refuses expired sessions`() {
        val token = register()
        mvc.post("/v1/sessions/refresh") { header("Authorization", "Bearer $token") }.andExpect {
            status { isOk() }
            jsonPath("$.token") { value(token) }
        }
        now = sessions.findAll().single().expiresAt.plusSeconds(1)
        mvc.post("/v1/sessions/refresh") { header("Authorization", "Bearer $token") }
            .andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `Swagger serves the contract without exposing generated definitions`() {
        mvc.get("/swagger-ui/index.html").andExpect { status { isOk() } }
        mvc.get("/v3/api-docs/swagger-config").andExpect {
            status { isOk() }
            jsonPath("$.url") { value("/openapi/api.yaml") }
        }
        mvc.get("/openapi/api.yaml").andExpect { status { isOk() } }
        mvc.get("/v3/api-docs").andExpect { status { isNotFound() } }
    }

    @Test
    fun `registers verifies stores hashed sessions and revokes access`() {
        val token = register()

        assertThat(accounts.count()).isEqualTo(IS_EQUAL_TO_1.toLong())
        assertThat(sessions.findAll().single().tokenHash).isNotEqualTo(token)
        mvc.get("/v1/me") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                jsonPath("$.email") { value("anna@example.com") }
            }
        mvc.post("/internal/v1/sessions/introspect") { header("Authorization", "Bearer $token") }
            .andExpect { status { isUnauthorized() } }
        mvc.post("/internal/v1/sessions/introspect") {
            header("Authorization", "Bearer $token")
            header("X-Service-Authorization", serviceAuthorization())
        }.andExpect {
            status { isOk() }
            jsonPath("$.userId") { exists() }
        }

        val sessionId = sessions.findAll().single().id

        mvc.delete("/v1/sessions/$sessionId") { header("Authorization", "Bearer $token") }
            .andExpect { status { isNoContent() } }
        mvc.get("/v1/me") { header("Authorization", "Bearer $token") }
            .andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `concurrent session activity updates preserve authentication`() {
        val token = register()

        now = now.plusSeconds(PLUS_SECONDS_61)

        val principals = java.util.stream.IntStream.range(PRINCIPALS_0, PRINCIPALS_8).parallel()
            .mapToObj { verifier.verify(token).sessionId }
            .toList()

        assertThat(principals.distinct()).hasSize(HAS_SIZE_1)
        assertThat(sessions.findAll().single().lastSeenAt).isEqualTo(now)
        mvc.get("/v1/me") { header("Authorization", "Bearer $token") }
            .andExpect { status { isOk() } }
    }

    @Test
    fun `persists failed code attempts and prevents resend before cooldown`() {
        val id = begin()
        val incorrect = if (code == "000000") {
            "111111"
        } else {
            "000000"
        }

        java.util.stream.IntStream.range(RANGE_0, RANGE_5).forEach {
            mvc.post("/v1/challenges/$id/verify") {
                contentType = MediaType.APPLICATION_JSON
                content = mapper.writeValueAsString(mapOf("code" to incorrect))
            }.andExpect {
                status { isBadRequest() }
                jsonPath("$.code") { value(INVALID_CODE) }
            }
        }
        assertThat(challenges.findAll().single().attempts).isEqualTo(IS_EQUAL_TO_5)
        mvc.post("/v1/challenges/$id/verify") {
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(mapOf("code" to code))
        }.andExpect { status { isTooManyRequests() } }
    }

    @Test
    fun `expires codes and does not consume a grant on invalid password`() {
        val id = begin()
        val grant = verify(id)

        mvc.post("/v1/registrations/complete") {
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(mapOf("challengeId" to id, "grant" to grant, "password" to "short"))
        }.andExpect { status { isBadRequest() } }
        assertThat(challenges.findAll().single().consumed).isFalse()
        now = now.plusSeconds(PLUS_SECONDS_601)
        mvc.post("/v1/challenges/$id/verify") {
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(mapOf("code" to code))
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.code") { value(EXPIRED_CHALLENGE) }
        }
    }

    @Test
    fun `resends after cooldown and invalidates the previous code`() {
        val id = begin()
        val oldCode = code

        mvc.post("/v1/challenges/$id/resend").andExpect { status { isTooManyRequests() } }
        now = now.plusSeconds(PLUS_SECONDS_61)
        mvc.post("/v1/challenges/$id/resend").andExpect { status { isAccepted() } }
        assertThat(challenges.findAll().single().sends).isEqualTo(EXPECTED_PAIR_COUNT)

        if (oldCode != code) {
            mvc.post("/v1/challenges/$id/verify") {
                contentType = MediaType.APPLICATION_JSON
                content = mapper.writeValueAsString(mapOf("code" to oldCode))
            }.andExpect { status { isBadRequest() } }
        }

        verify(id)
    }

    @Test
    fun `recovery changes password and revokes existing sessions`() {
        val oldToken = register()
        val recovery = mvc.post("/v1/recovery") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"anna@example.com","locale":"en"}"""
        }.andExpect { status { isAccepted() } }.andReturn()
        val id = mapper.readTree(recovery.response.contentAsString).path("id").asText()
        val grant = verify(id)

        mvc.post("/v1/recovery/complete") {
            contentType = MediaType.APPLICATION_JSON
            content =
                mapper.writeValueAsString(
                    mapOf("challengeId" to id, "grant" to grant, "password" to "updated-password"),
                )
        }.andExpect { status { isNoContent() } }
        mvc.get("/v1/me") { header("Authorization", "Bearer $oldToken") }.andExpect { status { isUnauthorized() } }
        mvc.post("/v1/sessions") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"anna@example.com","password":"updated-password"}"""
        }.andExpect { status { isCreated() } }
    }

    @Test
    fun `validates input and preserves a supplied request id`() {
        mvc.post("/v1/registrations") {
            header("X-Request-ID", "integration-123")
            contentType = MediaType.APPLICATION_JSON
            content = """{"firstName":"","lastName":"A","email":"invalid","locale":"ru"}"""
        }.andExpect {
            status { isBadRequest() }
            header { string("X-Request-ID", "integration-123") }
            jsonPath("$.code") { value(INVALID_INPUT) }
            jsonPath("$.requestId") { value("integration-123") }
        }
    }

    @Test
    fun `member avatar requires a trusted service and supports public author display without a session`() {
        val token = register()
        val account = accounts.findAll().single()
        val avatar = byteArrayOf(AVATAR_1.toByte(), AVATAR_2.toByte(), AVATAR_3)

        account.avatar = avatar
        accounts.save(account)

        val path = "/internal/v1/users/${account.id}/avatar"

        mvc.get(path) { header("Authorization", "Bearer $token") }
            .andExpect { status { isUnauthorized() } }
        mvc.get(path) { header("X-Service-Authorization", serviceAuthorization()) }
            .andExpect {
                status { isOk() }
                content { bytes(avatar) }
            }
        mvc.get(path) {
            header("Authorization", "Bearer $token")
            header("X-Service-Authorization", serviceAuthorization())
        }.andExpect {
            status { isOk() }
            content { bytes(avatar) }
            header { string("Cache-Control", "private, no-store") }
        }

        val withoutAvatar = accounts.findAll().single()

        withoutAvatar.avatar = null
        accounts.save(withoutAvatar)
        mvc.get(path) {
            header("Authorization", "Bearer $token")
            header("X-Service-Authorization", serviceAuthorization())
            accept = MediaType.IMAGE_JPEG
        }.andExpect {
            status { isNotFound() }
            content { contentType(MediaType.APPLICATION_JSON) }
            jsonPath("$.code") { value("AVATAR_NOT_FOUND") }
        }
    }

    @Test
    fun `author directory returns current identity in bulk without private account data`() {
        register()
        var account = accounts.findAll().single()
        val path = "/internal/v1/users/profiles"
        val body = mapper.writeValueAsString(listOf(account.id, java.util.UUID.randomUUID()))
        mvc.post(path) {
            contentType = MediaType.APPLICATION_JSON
            content = body
        }
            .andExpect { status { isUnauthorized() } }
        account.firstName = "Система"
        account.lastName = ""
        account.avatar = byteArrayOf(AVATAR_1)
        account = accounts.saveAndFlush(account)
        val result = mvc.post(path) {
            header("X-Service-Authorization", serviceAuthorization())
            contentType = MediaType.APPLICATION_JSON
            content = body
        }.andExpect {
            status { isOk() }
            header { string("Cache-Control", "private, no-store") }
        }.andReturn()
        val profile = mapper.readTree(result.response.contentAsString).single()
        assertThat(profile["name"].asText()).isEqualTo("Система")
        assertThat(profile["hasAvatar"].asBoolean()).isTrue()
        assertThat(profile["version"].asLong()).isEqualTo(account.version)
        val publicFields = profile.fieldNames().asSequence().toSet()
        assertThat(publicFields).containsExactlyInAnyOrder("id", "name", "hasAvatar", "version")
        account.firstName = "Новое имя"
        account.avatar = null
        account = accounts.saveAndFlush(account)
        val updated = mvc.post(path) {
            header("X-Service-Authorization", serviceAuthorization())
            contentType = MediaType.APPLICATION_JSON
            content = body
        }.andExpect { status { isOk() } }.andReturn()
        val refreshed = mapper.readTree(updated.response.contentAsString).single()
        assertThat(refreshed["name"].asText()).isEqualTo("Новое имя")
        assertThat(refreshed["hasAvatar"].asBoolean()).isFalse()
        assertThat(refreshed["version"].asLong()).isGreaterThan(profile["version"].asLong())
        mvc.post(path) {
            header("X-Service-Authorization", serviceAuthorization())
            contentType = MediaType.APPLICATION_JSON
            content = "[]"
        }.andExpect { status { isBadRequest() } }
    }

    private fun begin(): String {
        val result = mvc.post("/v1/registrations") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"firstName":"Анна","lastName":"Иванова","email":"anna@example.com","locale":"ru"}"""
        }.andExpect { status { isAccepted() } }.andReturn()

        return mapper.readTree(result.response.contentAsString).path("id").asText()
    }

    private fun verify(id: String): String {
        val result = mvc.post("/v1/challenges/$id/verify") {
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(mapOf("code" to code))
        }.andExpect { status { isOk() } }.andReturn()

        return mapper.readTree(result.response.contentAsString).path("grant").asText()
    }

    private fun register(): String {
        val id = begin()
        val grant = verify(id)
        val result = mvc.post("/v1/registrations/complete") {
            contentType = MediaType.APPLICATION_JSON
            content =
                mapper.writeValueAsString(
                    mapOf("challengeId" to id, "grant" to grant, "password" to "correct-password"),
                )
            header("X-Client-OS", "Windows")
            header("X-Client-OS-Version", "11")
            header("X-Client-IP", "203.0.113.10")
            header("X-Service-Authorization", serviceAuthorization())
        }.andExpect { status { isCreated() } }.andReturn()

        assertThat(sessions.findAll().single().ip).isEqualTo("203.0.113.10")

        return mapper.readTree(result.response.contentAsString).path("token").asText()
    }
    private fun serviceAuthorization(): String = "Bearer " +
        SignedJwt("tests-internal-jwt-secret-at-least-thirty-two-characters").service("integration-test")
}
