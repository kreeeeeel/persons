package com.persons.id

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.id.dao.entity.AccountEntity
import com.persons.id.dao.repository.AccountRepository
import com.persons.id.dao.repository.ChallengeRepository
import com.persons.id.dao.repository.LoginAttemptRepository
import com.persons.id.dao.repository.NotificationRepository
import com.persons.id.dao.repository.SessionRepository
import com.persons.id.domain.PreparedNotification
import com.persons.id.service.NotificationService
import com.persons.id.service.SessionService
import com.persons.id.transformer.toDomain
import com.persons.requestobservability.ClientMetadata
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.util.Base64
import java.util.UUID
import javax.imageio.ImageIO

private const val GET_ARGUMENT_2 = 2
private const val GET_ARGUMENT_0 = 0
private const val BUFFERED_IMAGE_384 = 384
private const val COMPLETE_EMAIL_400 = 400
private const val COMPLETE_EMAIL_204 = 204
private const val COMPLETE_EMAIL_409 = 409
private const val REPEAT_40 = 40

private const val PASSWORD = "correct-password"
private const val UPDATED_PASSWORD = "updated-password"

@SpringBootTest(
    properties = [
        "spring.datasource.url=jdbc:h2:mem:settings;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "project.id.avatar-sync-delay-ms=3600000",
    ],
)
@AutoConfigureMockMvc
@ActiveProfiles("tests")
class AccountSettingsIntegrationTest {
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
    private lateinit var notifications: NotificationRepository

    @Autowired
    private lateinit var attempts: LoginAttemptRepository

    @Autowired
    private lateinit var passwords: PasswordEncoder

    @Autowired
    private lateinit var sessionService: SessionService

    @MockitoBean
    private lateinit var notifier: NotificationService

    private var code = ""

    @BeforeEach
    fun reset() {
        notifications.deleteAll()
        challenges.deleteAll()
        sessions.deleteAll()
        accounts.deleteAll()
        attempts.deleteAll()
        `when`(notifier.prepare(anyString(), anyString(), anyString(), anyString())).thenAnswer {
            code = it.getArgument(GET_ARGUMENT_2)
            PreparedNotification(it.getArgument(GET_ARGUMENT_0), "Verification", "<strong>$code</strong>")
        }
    }

    @Test
    fun `profile update trims names and changes only the authenticated account`() {
        val owner = createAccount("profile-owner@example.test")
        val stranger = createAccount("profile-stranger@example.test")
        val current = session(owner)
        val input = mapper.writeValueAsString(
            mapOf("firstName" to " Мария ", "lastName" to " Петрова ", "patronymic" to " Сергеевна"),
        )

        mvc.put("/account/v1/profile") {
            contentType = MediaType.APPLICATION_JSON
            content = input
        }.andExpect { status { isUnauthorized() } }
        mvc.put("/account/v1/profile") {
            header("Authorization", "Bearer $current")
            contentType = MediaType.APPLICATION_JSON
            content = input
        }.andExpect { status { isNoContent() } }
        mvc.get("/v1/me") { header("Authorization", "Bearer $current") }.andExpect {
            jsonPath("$.firstName") { value("Мария") }
            jsonPath("$.lastName") { value("Петрова") }
            jsonPath("$.patronymic") { value("Сергеевна") }
        }
        assertThat(accounts.findById(stranger.id).orElseThrow().firstName).isEqualTo("Анна")
        listOf("", "   ", "я".repeat(11)).stream().forEach { name ->
            mvc.put("/account/v1/profile") {
                header("Authorization", "Bearer $current")
                contentType = MediaType.APPLICATION_JSON
                content = mapper.writeValueAsString(mapOf("firstName" to name, "lastName" to "Петрова"))
            }.andExpect { status { isBadRequest() } }
        }
        assertThat(accounts.findById(owner.id).orElseThrow().firstName).isEqualTo("Мария")
        mvc.put("/account/v1/profile") {
            header("Authorization", "Bearer $current")
            contentType = MediaType.APPLICATION_JSON
            content =
                mapper.writeValueAsString(mapOf("firstName" to "Мария", "lastName" to "Петрова", "patronymic" to ""))
        }.andExpect { status { isNoContent() } }
        assertThat(accounts.findById(owner.id).orElseThrow().patronymic).isNull()
    }

    @Test
    fun `avatar changes validate images and modify only the authenticated account`() {
        val owner = createAccount("avatar-owner@example.test")

        owner.avatarObjectKey = "Persons/User-image/previous/avatar.jpg"
        accounts.save(owner)

        val stranger = createAccount("avatar-stranger@example.test")
        val current = session(owner)
        val output = ByteArrayOutputStream()

        ImageIO.write(BufferedImage(BUFFERED_IMAGE_384, BUFFERED_IMAGE_384, BufferedImage.TYPE_INT_RGB), "jpeg", output)

        val content = mapper.writeValueAsString(
            mapOf(
                "avatarBase64" to "data:image/jpeg;base64,${Base64.getEncoder().encodeToString(output.toByteArray())}",
            ),
        )

        mvc.put("/account/v1/avatar") {
            contentType = MediaType.APPLICATION_JSON
            this.content = content
        }.andExpect { status { isUnauthorized() } }
        mvc.put("/account/v1/avatar") {
            header("Authorization", "Bearer $current")
            contentType = MediaType.APPLICATION_JSON
            this.content = "{\"avatarBase64\":\"data:image/jpeg;base64,invalid\"}"
        }.andExpect { status { isBadRequest() } }
        assertThat(accounts.findById(owner.id).orElseThrow().avatarObjectKey).isEqualTo(owner.avatarObjectKey)
        mvc.put("/account/v1/avatar") {
            header("Authorization", "Bearer $current")
            contentType = MediaType.APPLICATION_JSON
            this.content = content
        }.andExpect { status { isNoContent() } }

        val updated = accounts.findById(owner.id).orElseThrow()

        assertThat(updated.avatar).isNotEmpty()
        assertThat(updated.avatarObjectKey).isNull()
        assertThat(accounts.findById(stranger.id).orElseThrow().avatar).isNull()
        mvc.get("/v1/me/avatar") { header("Authorization", "Bearer $current") }.andExpect {
            status { isOk() }
            content { contentType(MediaType.IMAGE_JPEG) }
        }
    }

    @Test
    fun `password changes require the current password and preserve only this device`() {
        val account = createAccount("owner@example.test")
        val current = session(account)
        val other = session(account)

        mvc.put("/account/v1/password") {
            header("Authorization", "Bearer $current")
            contentType = MediaType.APPLICATION_JSON
            content =
                mapper.writeValueAsString(mapOf("currentPassword" to "wrong-password", "password" to UPDATED_PASSWORD))
        }.andExpect { status { isUnauthorized() } }
        assertThat(passwords.matches(PASSWORD, accounts.findById(account.id).orElseThrow().passwordHash)).isTrue()
        mvc.put("/account/v1/password") {
            header("Authorization", "Bearer $current")
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(mapOf("currentPassword" to PASSWORD, "password" to UPDATED_PASSWORD))
        }.andExpect { status { isNoContent() } }
        assertThat(
            passwords.matches(
                UPDATED_PASSWORD,
                accounts.findById(account.id).orElseThrow()
                    .passwordHash,
            ),
        ).isTrue()
        mvc.get("/v1/me") { header("Authorization", "Bearer $current") }.andExpect { status { isOk() } }
        mvc.get("/v1/me") { header("Authorization", "Bearer $other") }.andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `email grant belongs to the initiating user and cannot be consumed twice`() {
        val account = createAccount("owner@example.test")
        val current = session(account)
        val other = session(account)
        val stranger = session(createAccount("stranger@example.test"))
        val id = beginEmail(current, "updated@example.test")
        val grant = verify(id)

        completeEmail(stranger, id, grant, COMPLETE_EMAIL_400)
        assertThat(challenges.findById(UUID.fromString(id)).orElseThrow().consumed).isFalse()
        completeEmail(current, id, grant, COMPLETE_EMAIL_204)
        assertThat(accounts.findById(account.id).orElseThrow().email).isEqualTo("updated@example.test")
        mvc.get("/v1/me") { header("Authorization", "Bearer $other") }.andExpect { status { isUnauthorized() } }
        mvc.get("/v1/me") { header("Authorization", "Bearer $current") }.andExpect {
            status { isOk() }
            jsonPath("$.email") { value("updated@example.test") }
        }
        completeEmail(current, id, grant, COMPLETE_EMAIL_400)
    }

    @Test
    fun `occupied email rolls back grant consumption and leaves the account unchanged`() {
        val account = createAccount("owner@example.test")
        val current = session(account)
        val id = beginEmail(current, "taken@example.test")
        val grant = verify(id)

        createAccount("taken@example.test")
        completeEmail(current, id, grant, COMPLETE_EMAIL_409)
        assertThat(accounts.findById(account.id).orElseThrow().email).isEqualTo("owner@example.test")
        assertThat(challenges.findById(UUID.fromString(id)).orElseThrow().consumed).isFalse()
    }

    @Test
    fun `bulk revocation keeps this device and does not affect another user`() {
        val account = createAccount("owner@example.test")
        val current = session(account)
        val other = session(account)
        val stranger = session(createAccount("stranger@example.test"))

        mvc.delete("/v1/sessions/others") { header("Authorization", "Bearer $current") }
            .andExpect { status { isNoContent() } }
        mvc.get("/v1/me") { header("Authorization", "Bearer $current") }.andExpect { status { isOk() } }
        mvc.get("/v1/me") { header("Authorization", "Bearer $stranger") }.andExpect { status { isOk() } }
        mvc.get("/v1/me") { header("Authorization", "Bearer $other") }.andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `invalid password length and UTF8 size are rejected without changing credentials`() {
        val account = createAccount("owner@example.test")
        val current = session(account)

        listOf("short", "я".repeat(REPEAT_40)).stream().forEach { password ->
            mvc.put("/account/v1/password") {
                header("Authorization", "Bearer $current")
                contentType = MediaType.APPLICATION_JSON
                content = mapper.writeValueAsString(mapOf("currentPassword" to PASSWORD, "password" to password))
            }.andExpect { status { isBadRequest() } }
        }
        assertThat(passwords.matches(PASSWORD, accounts.findById(account.id).orElseThrow().passwordHash)).isTrue()
        mvc.post("/account/v1/email") {
            contentType = MediaType.APPLICATION_JSON
            content =
                mapper.writeValueAsString(
                    mapOf("email" to "new@example.test", "currentPassword" to PASSWORD, "locale" to "ru"),
                )
        }.andExpect { status { isUnauthorized() } }
    }

    private fun createAccount(email: String): AccountEntity = accounts.save(
        AccountEntity(
            email = email,
            firstName = "Анна",
            lastName = "Иванова",
            passwordHash = passwords.encode(PASSWORD),
        ),
    )

    private fun session(account: AccountEntity): String = sessionService.issue(
        account.toDomain(),
        ClientMetadata("127.0.0.1", "tests", "Windows", "11", "Edge", "desktop", "tests", "ru"),
    ).token

    private fun beginEmail(token: String, email: String): String {
        val result = mvc.post("/account/v1/email") {
            header("Authorization", "Bearer $token")
            contentType = MediaType.APPLICATION_JSON
            content =
                mapper.writeValueAsString(mapOf("email" to email, "currentPassword" to PASSWORD, "locale" to "ru"))
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

    private fun completeEmail(token: String, id: String, grant: String, expectedStatus: Int) {
        mvc.post("/account/v1/email/complete") {
            header("Authorization", "Bearer $token")
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(mapOf("challengeId" to id, "grant" to grant))
        }.andExpect { status { isEqualTo(expectedStatus) } }
    }
}
