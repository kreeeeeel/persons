package com.persons.requestobservability

import com.fasterxml.jackson.databind.ObjectMapper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class OAuthRedactionTest {
    @Test
    fun `OAuth proofs are never included in request logging`() {
        val redactor = BodyRedactor(ObjectMapper(), ObservabilityProperties())
        val body = """{"state":"private-state","browserBinding":"private-binding","code_verifier":"private-proof"}"""

        assertThat(redactor.redact(body.toByteArray(), "application/json"))
            .doesNotContain("private-state", "private-binding", "private-proof")
    }
}
