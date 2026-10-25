package com.persons.requestobservability

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

private const val BYTE_ARRAY_65537 = 65537
private const val REDACTED = "REDACTED"

class BodyRedactorTest {
    private val redactor =
        BodyRedactor(jacksonObjectMapper(), ObservabilityProperties(maskedFields = listOf("*email*")))

    @Test
    fun `masks nested secrets and custom patterns without dropping regular payloads`() {
        val json = """
            {"password":"secret","items":[{"code":"123456","name":"Anna","contactEmail":"private"}],"grant":"proof",
            "html":"<strong>654321</strong>","avatarBase64":"binary-data"}
        """.trimIndent()
        val result = redactor.redact(json.toByteArray(), "application/json")

        assertThat(result).doesNotContain("secret", "123456", "private", "proof", "654321", "binary-data")
        assertThat(result).contains("Anna", REDACTED)
        assertThat(redactor.masked("Set-Cookie", emptyList())).isTrue()
    }

    @Test
    fun `omits malformed non JSON and oversized bodies`() {
        assertThat(redactor.redact("password=secret".toByteArray(), "text/plain")).doesNotContain("secret")
        assertThat(redactor.redact("{secret".toByteArray(), "application/json")).contains("omitted")
        assertThat(redactor.redact(ByteArray(BYTE_ARRAY_65537), "application/json")).contains("omitted")
    }

    @Test
    fun `invitation tokens and referrer headers never enter request logs`() {
        assertThat(redactor.path("/v1/invitations/secret-link-token/join"))
            .isEqualTo("/v1/invitations/[REDACTED]/join")
        assertThat(redactor.path("/home/ru/invite/secret-link-token"))
            .isEqualTo("/home/ru/invite/[REDACTED]")
        assertThat(redactor.path("/v1/homes/known-home/members")).isEqualTo("/v1/homes/known-home/members")
        assertThat(redactor.masked("Referer")).isTrue()
    }
}
