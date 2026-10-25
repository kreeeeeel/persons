package com.persons.id

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.id.dao.entity.AccountEntity
import com.persons.id.dao.entity.OAuthIdentityEntity
import com.persons.id.dao.entity.SessionEntity
import com.persons.id.dao.repository.AccountRepository
import com.persons.id.dao.repository.OAuthFlowRepository
import com.persons.id.dao.repository.OAuthIdentityRepository
import com.persons.id.dao.repository.SessionRepository
import com.persons.id.domain.AccountRole
import com.persons.id.domain.AccountStatus
import com.persons.id.exception.impl.InvalidOAuthException
import com.persons.id.oauth.OAuthIdentity
import com.persons.id.oauth.impl.YandexOAuthProvider
import com.persons.id.service.AdminService
import com.persons.id.service.OAuthFlowService
import com.persons.id.service.SessionService
import com.persons.id.transformer.toDomain
import com.persons.requestobservability.ClientMetadata
import com.persons.requestobservability.SignedJwt
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
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
import org.springframework.test.web.servlet.put
import java.time.Clock
import java.time.Instant
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

private const val BINDING = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
private const val OTHER_BINDING = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
private const val TEST_SERVICE_KEY = "tests-internal-jwt-secret-at-least-thirty-two-characters"

@SpringBootTest(
    properties = [
        "spring.datasource.url=jdbc:h2:mem:access-tests;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "project.id.avatar-sync-delay-ms=3600000",
    ],
)
@AutoConfigureMockMvc
@ActiveProfiles("tests")
class AccessAndOAuthIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var mapper: ObjectMapper

    @Autowired private lateinit var accounts: AccountRepository

    @Autowired private lateinit var sessions: SessionRepository

    @Autowired private lateinit var identities: OAuthIdentityRepository

    @Autowired private lateinit var flows: OAuthFlowRepository

    @Autowired private lateinit var flowService: OAuthFlowService

    @Autowired private lateinit var sessionService: SessionService

    @Autowired private lateinit var admin: AdminService

    @MockitoBean private lateinit var yandex: YandexOAuthProvider

    @MockitoBean private lateinit var clock: Clock

    private var now = Instant.parse("2026-10-17T12:00:00Z")

    @BeforeEach
    fun reset() {
        sessions.deleteAll()
        identities.deleteAll()
        flows.deleteAll()
        accounts.deleteAll()
        now = Instant.parse("2026-10-17T12:00:00Z")
        `when`(clock.instant()).thenAnswer { now }
        `when`(yandex.id).thenReturn("yandex")
        `when`(yandex.authorizationUrl(anyString(), anyString())).thenAnswer {
            "https://oauth.yandex.ru/authorize?state=${it.getArgument<String>(0)}"
        }
        `when`(yandex.identify(anyString(), anyString())).thenReturn(
            OAuthIdentity("yandex-user-1", "friend@example.test", "Friend", "Character"),
        )
    }

    @Test
    fun `OAuth creates a normal account and cannot replay the callback`() {
        val state = begin()
        val token = complete(state)

        assertThat(accounts.findAll().single().role).isEqualTo(AccountRole.USER)
        assertThat(identities.count()).isEqualTo(1)
        mvc.get("/v1/me") { header("Authorization", "Bearer $token") }.andExpect {
            status { isOk() }
            jsonPath("$.role") { value("USER") }
        }
        callback(state).andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `concurrent OAuth callbacks consume the state exactly once`() {
        val state = flowService.begin("yandex", BINDING, "ru").first
        val start = CountDownLatch(1)
        val callbacks = java.util.stream.IntStream.range(0, 2).mapToObj {
            CompletableFuture.supplyAsync {
                start.await(5, TimeUnit.SECONDS)
                try {
                    flowService.consume("yandex", state, BINDING)
                    true
                } catch (_: InvalidOAuthException) {
                    false
                }
            }
        }.toList()

        start.countDown()

        assertThat(callbacks.stream().map { it.get(5, TimeUnit.SECONDS) }.toList())
            .containsExactlyInAnyOrder(true, false)
        assertThat(flows.findAll().single().consumed).isTrue()
    }

    @Test
    fun `OAuth rejects a different browser before exchanging credentials`() {
        val state = begin()

        callback(state, OTHER_BINDING).andExpect { status { isUnauthorized() } }
        verify(yandex, never()).identify(anyString(), anyString())
        assertThat(flows.findAll().single().consumed).isFalse()
    }

    @Test
    fun `OAuth expires after ten minutes`() {
        val state = begin()

        now = now.plusSeconds(601)
        callback(state).andExpect { status { isUnauthorized() } }
        verify(yandex, never()).identify(anyString(), anyString())
    }

    @Test
    fun `OAuth never auto links an existing account by email`() {
        accounts.save(AccountEntity(email = "friend@example.test"))

        callback(begin()).andExpect {
            status { isConflict() }
            jsonPath("$.code") { value("OAUTH_ACCOUNT_CONFLICT") }
        }
        assertThat(identities.count()).isZero()
        assertThat(accounts.count()).isEqualTo(1)
    }

    @Test
    fun `OAuth rejects blocked linked accounts`() {
        val account = accounts.save(AccountEntity(email = "friend@example.test", status = AccountStatus.BLOCKED))

        identities.save(OAuthIdentityEntity(provider = "yandex", subject = "yandex-user-1", userId = account.id))
        callback(begin()).andExpect { status { isForbidden() } }
        assertThat(sessions.count()).isZero()
    }

    @Test
    fun `OAuth validates binding on the HTTP boundary`() {
        mvc.post("/v1/oauth/yandex/authorization") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"browserBinding":"short","locale":"ru"}"""
        }.andExpect { status { isBadRequest() } }
        assertThat(flows.count()).isZero()
    }

    @Test
    fun `only an administrator can list or change user access`() {
        val user = accounts.save(AccountEntity(email = "user@example.test"))
        val token = token(user)

        mvc.get("/internal/v1/admin/users") {
            header("Authorization", "Bearer $token")
            header("X-Service-Authorization", service())
        }.andExpect { status { isForbidden() } }
        mvc.put("/internal/v1/admin/users/${user.id}/access") {
            header("Authorization", "Bearer $token")
            header("X-Service-Authorization", service())
            contentType = MediaType.APPLICATION_JSON
            content = """{"role":"ADMIN","status":"ACTIVE"}"""
        }.andExpect { status { isForbidden() } }
        assertThat(accounts.findById(user.id).orElseThrow().role).isEqualTo(AccountRole.USER)
    }

    @Test
    fun `admin access changes revoke sessions and block login`() {
        val operator = accounts.save(AccountEntity(email = "admin@example.test", role = AccountRole.ADMIN))
        val friend = accounts.save(AccountEntity(email = "friend@example.test"))
        val friendToken = token(friend)
        val operatorToken = token(operator)

        mvc.put("/internal/v1/admin/users/${friend.id}/access") {
            header("Authorization", "Bearer $operatorToken")
            header("X-Service-Authorization", service())
            contentType = MediaType.APPLICATION_JSON
            content = """{"role":"USER","status":"BLOCKED"}"""
        }.andExpect { status { isOk() } }
        mvc.get("/v1/me") { header("Authorization", "Bearer $friendToken") }
            .andExpect { status { isUnauthorized() } }
        assertThat(accounts.findById(friend.id).orElseThrow().status).isEqualTo(AccountStatus.BLOCKED)
    }

    @Test
    fun `the final active administrator cannot be demoted or blocked`() {
        val operator = accounts.save(AccountEntity(email = "admin@example.test", role = AccountRole.ADMIN))
        val token = token(operator)

        mvc.put("/internal/v1/admin/users/${operator.id}/access") {
            header("Authorization", "Bearer $token")
            header("X-Service-Authorization", service())
            contentType = MediaType.APPLICATION_JSON
            content = """{"role":"USER","status":"BLOCKED"}"""
        }.andExpect {
            status { isConflict() }
            jsonPath("$.code") { value("LAST_ADMINISTRATOR") }
        }
        assertThat(accounts.findById(operator.id).orElseThrow().role).isEqualTo(AccountRole.ADMIN)
    }

    @Test
    fun `search uses literal wildcards and validates pagination`() {
        val operator = accounts.save(AccountEntity(email = "admin@example.test", role = AccountRole.ADMIN))
        val token = token(operator)

        accounts.save(AccountEntity(email = "friend@example.test"))
        mvc.get("/internal/v1/admin/users?search=%25") {
            header("Authorization", "Bearer $token")
            header("X-Service-Authorization", service())
        }.andExpect {
            status { isOk() }
            jsonPath("$.total") { value(0) }
        }
        mvc.get("/internal/v1/admin/users?size=1000") {
            header("Authorization", "Bearer $token")
            header("X-Service-Authorization", service())
        }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `administrator can terminate all sessions of another account`() {
        val operator = accounts.save(AccountEntity(email = "admin@example.test", role = AccountRole.ADMIN))
        val friend = accounts.save(AccountEntity(email = "friend@example.test"))
        val friendToken = token(friend)
        val operatorToken = token(operator)

        mvc.delete("/internal/v1/admin/users/${friend.id}/sessions") {
            header("Authorization", "Bearer $operatorToken")
            header("X-Service-Authorization", service())
        }.andExpect { status { isNoContent() } }
        mvc.get("/v1/me") { header("Authorization", "Bearer $friendToken") }
            .andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `bootstrap grants access only to the configured existing account`() {
        val friend = accounts.save(AccountEntity(email = "friend@example.test"))

        admin.bootstrap("owner@example.test")
        assertThat(accounts.findById(friend.id).orElseThrow().role).isEqualTo(AccountRole.USER)

        val owner = accounts.save(AccountEntity(email = "owner@example.test"))

        admin.bootstrap("OWNER@example.test")
        assertThat(accounts.findById(owner.id).orElseThrow().role).isEqualTo(AccountRole.ADMIN)
    }

    @Test
    fun `administrator sees only the selected accounts active session IPs without credentials`() {
        val operator = accounts.save(AccountEntity(email = "admin@example.test", role = AccountRole.ADMIN))
        val friend = accounts.save(AccountEntity(email = "friend@example.test"))
        val other = accounts.save(AccountEntity(email = "other@example.test"))
        val operatorToken = token(operator)
        sessionService.issue(
            friend.toDomain(),
            ClientMetadata("203.0.113.7", "tests", "Windows", "11", "Chrome", "desktop", "persons-person-web", "ru"),
        )
        token(other)
        sessions.save(SessionEntity(userId = friend.id, tokenHash = "expired", expiresAt = Instant.EPOCH))
        sessions.save(
            SessionEntity(
                userId = friend.id,
                tokenHash = "revoked",
                revoked = true,
                expiresAt = Instant.now().plusSeconds(600),
            ),
        )

        mvc.get("/internal/v1/admin/users/${friend.id}/sessions") {
            header("Authorization", "Bearer $operatorToken")
            header("X-Service-Authorization", service())
        }.andExpect {
            status { isOk() }
            header { string("Cache-Control", "private, no-store") }
            jsonPath("$.items.length()") { value(1) }
            jsonPath("$.items[0].ip") { value("203.0.113.7") }
            jsonPath("$.items[0].browser") { value("Chrome") }
            jsonPath("$.items[0].tokenHash") { doesNotExist() }
            jsonPath("$.items[0].token") { doesNotExist() }
        }
    }

    @Test
    fun `session IP inspection requires an authenticated administrator`() {
        val friend = accounts.save(AccountEntity(email = "friend@example.test"))
        val friendToken = token(friend)

        mvc.get("/internal/v1/admin/users/${friend.id}/sessions") {
            header("X-Service-Authorization", service())
        }.andExpect { status { isUnauthorized() } }
        mvc.get("/internal/v1/admin/users/${friend.id}/sessions") {
            header("Authorization", "Bearer $friendToken")
            header("X-Service-Authorization", service())
        }.andExpect { status { isForbidden() } }
    }

    @Test
    fun `session IP inspection distinguishes an empty account from an unknown account`() {
        val operator = accounts.save(AccountEntity(email = "admin@example.test", role = AccountRole.ADMIN))
        val friend = accounts.save(AccountEntity(email = "friend@example.test"))
        val operatorToken = token(operator)

        mvc.get("/internal/v1/admin/users/${friend.id}/sessions") {
            header("Authorization", "Bearer $operatorToken")
            header("X-Service-Authorization", service())
        }.andExpect {
            status { isOk() }
            jsonPath("$.items.length()") { value(0) }
        }
        mvc.get("/internal/v1/admin/users/${UUID.randomUUID()}/sessions") {
            header("Authorization", "Bearer $operatorToken")
            header("X-Service-Authorization", service())
        }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `administrator updates normalized account names without changing access or revoking sessions`() {
        val operator = accounts.save(AccountEntity(email = "admin@example.test", role = AccountRole.ADMIN))
        val friend = accounts.save(AccountEntity(email = "friend@example.test", patronymic = "Old"))
        val friendToken = token(friend)
        val operatorToken = token(operator)

        mvc.put("/internal/v1/admin/users/${friend.id}/profile") {
            header("Authorization", "Bearer $operatorToken")
            header("X-Service-Authorization", service())
            contentType = MediaType.APPLICATION_JSON
            content = """{"firstName":"  Ivan  ","lastName":"  Petrov  ","patronymic":" Ivanovich"}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.firstName") { value("Ivan") }
            jsonPath("$.lastName") { value("Petrov") }
            jsonPath("$.patronymic") { value("Ivanovich") }
            jsonPath("$.email") { value(friend.email) }
            jsonPath("$.role") { value("USER") }
        }
        mvc.get("/v1/me") { header("Authorization", "Bearer $friendToken") }.andExpect {
            status { isOk() }
            jsonPath("$.firstName") { value("Ivan") }
        }
        mvc.put("/internal/v1/admin/users/${friend.id}/profile") {
            header("Authorization", "Bearer $operatorToken")
            header("X-Service-Authorization", service())
            contentType = MediaType.APPLICATION_JSON
            content = """{"firstName":"Ivan","lastName":"Petrov"}"""
        }.andExpect { status { isOk() } }
        assertThat(accounts.findById(friend.id).orElseThrow().patronymic).isNull()
    }

    @Test
    fun `account name administration requires an administrator and an existing target`() {
        val friend = accounts.save(AccountEntity(email = "friend@example.test"))
        val friendToken = token(friend)
        val operator = accounts.save(AccountEntity(email = "admin@example.test", role = AccountRole.ADMIN))
        val operatorToken = token(operator)
        val update = """{"firstName":"Ivan","lastName":"Petrov"}"""

        mvc.put("/internal/v1/admin/users/${friend.id}/profile") {
            header("X-Service-Authorization", service())
            contentType = MediaType.APPLICATION_JSON
            content = update
        }.andExpect { status { isUnauthorized() } }
        mvc.put("/internal/v1/admin/users/${friend.id}/profile") {
            header("Authorization", "Bearer $friendToken")
            header("X-Service-Authorization", service())
            contentType = MediaType.APPLICATION_JSON
            content = update
        }.andExpect { status { isForbidden() } }
        mvc.put("/internal/v1/admin/users/${UUID.randomUUID()}/profile") {
            header("Authorization", "Bearer $operatorToken")
            header("X-Service-Authorization", service())
            contentType = MediaType.APPLICATION_JSON
            content = update
        }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `administrator cannot save blank names or overlong patronymics`() {
        val operator = accounts.save(AccountEntity(email = "admin@example.test", role = AccountRole.ADMIN))
        val friend = accounts.save(AccountEntity(email = "friend@example.test", firstName = "Original"))
        val operatorToken = token(operator)

        mvc.put("/internal/v1/admin/users/${friend.id}/profile") {
            header("Authorization", "Bearer $operatorToken")
            header("X-Service-Authorization", service())
            contentType = MediaType.APPLICATION_JSON
            content = """{"firstName":"   ","lastName":"Petrov"}"""
        }.andExpect { status { isBadRequest() } }
        mvc.put("/internal/v1/admin/users/${friend.id}/profile") {
            header("Authorization", "Bearer $operatorToken")
            header("X-Service-Authorization", service())
            contentType = MediaType.APPLICATION_JSON
            content = """{"firstName":"Ivan","lastName":"Petrov","patronymic":"${"x".repeat(81)}"}"""
        }.andExpect { status { isBadRequest() } }
        assertThat(accounts.findById(friend.id).orElseThrow().firstName).isEqualTo("Original")
    }

    private fun begin(): String {
        val result = mvc.post("/v1/oauth/yandex/authorization") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"browserBinding":"$BINDING","locale":"ru"}"""
        }.andExpect { status { isOk() } }.andReturn()

        return mapper.readTree(result.response.contentAsString)
            .get("authorizationUrl").asText().substringAfter("state=")
    }

    private fun callback(state: String, binding: String = BINDING) = mvc.post("/v1/oauth/yandex/complete") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"browserBinding":"$binding","state":"$state","code":"test-code"}"""
    }

    private fun complete(state: String): String {
        val result = callback(state).andExpect { status { isCreated() } }.andReturn()

        return mapper.readTree(result.response.contentAsString).get("token").asText()
    }

    private fun token(account: AccountEntity): String = sessionService.issue(
        account.toDomain(), ClientMetadata("127.0.0.1", "tests", "tests", "", "tests", "desktop", "tests", "ru"),
    ).token

    private fun service(): String = "Bearer ${SignedJwt(TEST_SERVICE_KEY).service("access-tests") }"
}
