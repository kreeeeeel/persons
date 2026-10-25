package com.persons.requestobservability

import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.web.filter.OncePerRequestFilter
import org.springframework.web.util.ContentCachingRequestWrapper
import java.util.Collections
import java.util.UUID
import java.util.stream.Collectors

private const val INPUT = 1
private const val HTTP_UNAUTHORIZED = 401
private const val FIELDS_1_000_000 = 1_000_000
private const val FIELDS_512 = 512
private const val UNAUTHORIZED = "UNAUTHORIZED"

class RequestLogFilter(
    private val properties: ObservabilityProperties,
    private val redactor: BodyRedactor,
    private val mapper: ObjectMapper,
    private val metadata: RequestMetadata,
) : OncePerRequestFilter() {
    private val requestLogger = LoggerFactory.getLogger(javaClass)

    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, chain: FilterChain) {
        val supplied = request.getHeader("X-Request-ID").orEmpty()
        val requestId = if (supplied.matches(Regex("[a-zA-Z0-9_-]{1,64}"))) {
            supplied
        } else {
            UUID.randomUUID().toString()
        }
        val started = System.nanoTime()

        response.setHeader("X-Request-ID", requestId)
        MDC.put("requestId", requestId)

        val capture = properties.bodiesEnabled && request.contentType?.contains("multipart") != true
        val input = if (capture) {
            ContentCachingRequestWrapper(request, properties.maxBodyBytes + INPUT)
        } else {
            request
        }
        val output = if (capture) {
            CapturingResponse(response, properties.maxBodyBytes)
        } else {
            response
        }

        try {
            if (request.requestURI.startsWith("/internal/") && !metadata.trustedService(request)) {
                response.status = HTTP_UNAUTHORIZED
                response.contentType = "application/json"
                mapper.writeValue(response.outputStream, mapOf("code" to UNAUTHORIZED, "requestId" to requestId))

                return
            }

            chain.doFilter(input, output)
        } finally {
            try {
                val fields = linkedMapOf<String, Any>(
                    "requestId" to requestId,
                    "method" to request.method,
                    "path" to redactor.path(request.requestURI),
                    "status" to output.status,
                    "durationMs" to (System.nanoTime() - started) / FIELDS_1_000_000,
                    "requestHeaders" to Collections.list(request.headerNames).stream().distinct().collect(
                        Collectors.toMap(
                            { it },
                            {
                                if (redactor.masked(it, properties.maskedHeaders)
                                ) {
                                    "[REDACTED]"
                                } else {
                                    request.getHeader(it).take(FIELDS_512)
                                }
                            },
                        ),
                    ),
                    "responseHeaders" to output.headerNames.stream().distinct().collect(
                        Collectors.toMap(
                            { it },
                            {
                                if (redactor.masked(it, properties.maskedHeaders)
                                ) {
                                    "[REDACTED]"
                                } else {
                                    output.getHeader(it).orEmpty()
                                }
                            },
                        ),
                    ),
                )

                if (input is ContentCachingRequestWrapper && output is CapturingResponse) {
                    fields["requestBody"] = redactor.redact(input.contentAsByteArray, input.contentType)
                    fields["responseBody"] = redactor.redact(output.capturedBody(), output.contentType)
                }

                requestLogger.info(mapper.writeValueAsString(fields))
            } finally {
                MDC.remove("requestId")
            }
        }
    }
}
