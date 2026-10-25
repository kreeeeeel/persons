package com.persons.requestobservability

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockHttpServletResponse

private const val RESPONSE_8 = 8
private const val HAS_SIZE_9 = 9

class CapturingResponseTest {
    @Test
    fun `bounds captured data without truncating the actual response`() {
        val original = MockHttpServletResponse()
        val response = CapturingResponse(original, RESPONSE_8)
        val bytes = "0123456789abcdef".toByteArray()

        response.outputStream.write(bytes)
        assertThat(response.capturedBody()).hasSize(HAS_SIZE_9)
        assertThat(original.contentAsByteArray).isEqualTo(bytes)
    }
}
