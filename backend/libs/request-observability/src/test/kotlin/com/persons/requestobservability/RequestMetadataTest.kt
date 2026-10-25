package com.persons.requestobservability

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockHttpServletRequest

private const val SECRET = "metadata-test-secret-at-least-thirty-two-characters"

class RequestMetadataTest {
    @Test
    fun `region and forwarded IP require a valid service token`() {
        val request = MockHttpServletRequest()

        request.remoteAddr = "127.0.0.1"
        request.addHeader("X-Client-IP", "203.0.113.10")
        request.addHeader("X-Client-Region", "Moscow")

        val metadata = RequestMetadata(SECRET)

        assertThat(metadata.client(request).ip).isEqualTo("127.0.0.1")
        assertThat(metadata.client(request).region).isEmpty()
        request.addHeader("X-Service-Authorization", "Bearer ${SignedJwt(SECRET).service("gateway")}")
        assertThat(metadata.client(request).ip).isEqualTo("203.0.113.10")
        assertThat(metadata.client(request).region).isEqualTo("Moscow")
    }
}
