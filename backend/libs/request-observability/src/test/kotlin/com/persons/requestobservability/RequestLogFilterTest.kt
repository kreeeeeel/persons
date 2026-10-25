package com.persons.requestobservability

import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.FilterChain
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import java.util.Collections

private const val IS_EQUAL_TO_200 = 200
private const val GET = "GET"

class RequestLogFilterTest {
    @Test
    fun `duplicate header names preserve the response and redact secrets in logs`() {
        val properties = ObservabilityProperties()
        val mapper = ObjectMapper()
        val filter = RequestLogFilter(
            properties,
            BodyRedactor(mapper, properties),
            mapper,
            RequestMetadata("test-only-internal-secret-with-at-least-32-characters"),
        )
        val request = Mockito.spy(MockHttpServletRequest(GET, "/swagger-ui/index.html"))

        request.addHeader("Authorization", "Bearer test-only-token")
        Mockito.`when`(request.headerNames).thenReturn(
            Collections.enumeration(listOf("Authorization", "Authorization")),
        )

        val response = Mockito.spy(MockHttpServletResponse())

        response.addHeader("Vary", "Origin")
        response.addHeader("Set-Cookie", "session=test-only-cookie")
        Mockito.`when`(response.headerNames).thenReturn(listOf("Vary", "Vary", "Set-Cookie", "Set-Cookie"))

        val logger = LoggerFactory.getLogger(RequestLogFilter::class.java) as Logger
        val appender = ListAppender<ILoggingEvent>()

        appender.start()
        logger.addAppender(appender)

        try {
            filter.doFilter(
                request,
                response,
                FilterChain { _, output ->
                    output.contentType = "application/json"
                    output.writer.write("{\"ready\":true}")
                },
            )

            assertThat(response.status).isEqualTo(IS_EQUAL_TO_200)
            assertThat(response.contentAsString).isEqualTo("{\"ready\":true}")
            assertThat(response.getHeader("X-Request-ID")).isNotBlank()

            val log = mapper.readTree(appender.list.single().formattedMessage)

            assertThat(log.path("requestHeaders").path("Authorization").asText()).isEqualTo("[REDACTED]")
            assertThat(log.path("responseHeaders").path("Vary").asText()).isEqualTo("Origin")
            assertThat(log.path("responseHeaders").path("Set-Cookie").asText()).isEqualTo("[REDACTED]")
            assertThat(MDC.get("requestId")).isNull()
        } finally {
            logger.detachAppender(appender)
            appender.stop()
        }
    }
}
