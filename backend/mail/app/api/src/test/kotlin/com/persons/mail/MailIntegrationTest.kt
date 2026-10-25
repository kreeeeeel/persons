package com.persons.mail

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.mail.dao.repository.MailRepository
import com.persons.mail.domain.OutgoingMail
import com.persons.mail.service.MailService
import com.persons.requestobservability.SignedJwt
import jakarta.mail.Session
import jakarta.mail.internet.MimeMessage
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.doThrow
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.mail.MailSendException
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.time.Instant
import java.util.Properties
import java.util.UUID

private const val RANGE_0 = 0
private const val RANGE_2 = 2
private const val IS_EQUAL_TO_1 = 1
private const val STATUSES_0 = 0
private const val STATUSES_8 = 8
private const val RANGE_5 = 5
private const val IS_EQUAL_TO_5 = 5
private const val SENT = "SENT"
private const val QUEUED = "QUEUED"
private const val FAILED = "FAILED"

@SpringBootTest(properties = ["project.mail.dispatch-delay-ms=3600000", "management.health.mail.enabled=false"])
@AutoConfigureMockMvc
@ActiveProfiles("tests")
class MailIntegrationTest {
    @Autowired
    private lateinit var mvc: MockMvc

    @Autowired
    private lateinit var mapper: ObjectMapper

    @Autowired
    private lateinit var repository: MailRepository

    @Autowired
    private lateinit var service: MailService

    @MockitoBean
    private lateinit var sender: JavaMailSender

    @BeforeEach
    fun reset() {
        repository.deleteAll()
        `when`(sender.createMimeMessage()).thenAnswer { MimeMessage(Session.getInstance(Properties())) }
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
    fun `requires service credentials and queues each message once`() {
        val id = UUID.randomUUID()
        val body = mapper.writeValueAsString(
            mapOf("id" to id, "recipient" to "anna@example.com", "subject" to "Persons", "html" to "<p>Hello</p>"),
        )

        mvc.post("/internal/v1/messages") {
            contentType = MediaType.APPLICATION_JSON
            content = body
        }.andExpect { status { isUnauthorized() } }
        java.util.stream.IntStream.range(RANGE_0, RANGE_2).forEach {
            mvc.post("/internal/v1/messages") {
                header("X-Service-Authorization", serviceAuthorization())
                contentType = MediaType.APPLICATION_JSON
                content = body
            }.andExpect { status { isAccepted() } }
        }
        assertThat(repository.count()).isEqualTo(IS_EQUAL_TO_1.toLong())
        service.dispatch()

        val delivered = repository.findById(id).orElseThrow()

        assertThat(delivered.status).isEqualTo(SENT)
        assertThat(delivered.html).isEmpty()
        verify(sender).send(any(MimeMessage::class.java))
    }

    @Test
    fun `concurrent retries create only one queued message`() {
        val id = UUID.randomUUID()
        val message = OutgoingMail(id, "anna@example.com", "Persons", "<p>Code</p>")
        val statuses = java.util.stream.IntStream.range(STATUSES_0, STATUSES_8).parallel()
            .mapToObj { service.enqueue(message) }
            .toList()

        assertThat(statuses).containsOnly(QUEUED)
        assertThat(repository.count()).isEqualTo(IS_EQUAL_TO_1.toLong())
        assertThat(repository.findById(id).orElseThrow().attempts).isZero()
    }

    @Test
    fun `retries smtp failures and clears content after the final attempt`() {
        val id = UUID.randomUUID()

        service.enqueue(OutgoingMail(id, "anna@example.com", "Persons", "<p>Code</p>"))
        doThrow(MailSendException("SMTP unavailable")).`when`(sender).send(any(MimeMessage::class.java))
        java.util.stream.IntStream.range(RANGE_0, RANGE_5).forEach {
            val message = repository.findById(id).orElseThrow()

            message.nextAttemptAt = Instant.EPOCH
            repository.saveAndFlush(message)
            service.dispatch()
        }

        val failed = repository.findById(id).orElseThrow()

        assertThat(failed.status).isEqualTo(FAILED)
        assertThat(failed.attempts).isEqualTo(IS_EQUAL_TO_5)
        assertThat(failed.html).isEmpty()
    }
    private fun serviceAuthorization(): String = "Bearer " +
        SignedJwt("tests-internal-jwt-secret-at-least-thirty-two-characters").service("integration-test")
}
