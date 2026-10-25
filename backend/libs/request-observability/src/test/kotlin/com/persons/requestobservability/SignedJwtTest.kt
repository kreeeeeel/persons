package com.persons.requestobservability

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Instant

private const val TOKEN_60 = 60L
private const val PLUS_SECONDS_61 = 61L

class SignedJwtTest {
    private val tokens = SignedJwt("test-internal-jwt-secret-at-least-32-characters")
    private val now = Instant.parse("2026-10-07T12:00:00Z")

    @Test
    fun `validates signature expiry audience and token purpose`() {
        val token = tokens.issue("id", "persons-internal", "service", now, now.plusSeconds(TOKEN_60))

        assertThat(tokens.verify(token, "persons-internal", "service", now)?.subject).isEqualTo("id")
        assertThat(tokens.verify(token, "persons-api", "session", now)).isNull()
        assertThat(tokens.verify(token, "persons-internal", "service", now.plusSeconds(PLUS_SECONDS_61))).isNull()
        assertThat(
            SignedJwt("another-test-secret-at-least-32-characters").verify(token, "persons-internal", "service", now),
        ).isNull()
        assertThat(tokens.verify("invalid", "persons-internal", "service", now)).isNull()
    }
}
