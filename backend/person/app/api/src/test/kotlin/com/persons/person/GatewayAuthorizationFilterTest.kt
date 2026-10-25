package com.persons.person

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.component.GatewayAuthorizationFilter
import com.persons.person.configuration.properties.GatewayProperties
import com.persons.requestobservability.SignedJwt
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import java.time.Instant

private const val SECRET = "tests-gateway-secret-with-at-least-thirty-two-characters"

class GatewayAuthorizationFilterTest {
    private val filter = GatewayAuthorizationFilter(GatewayProperties(SECRET), ObjectMapper())

    @Test
    fun `direct and forged calls cannot bypass the gateway`() {
        listOf(null, "Bearer forged", "Bearer ${SignedJwt(SECRET).service("another-service")}").stream().forEach {
            val request = MockHttpServletRequest("POST", "/v1/persons")
            if (it != null) request.addHeader("X-Gateway-Authorization", it)
            val response = MockHttpServletResponse()
            val chain = Mockito.mock(jakarta.servlet.FilterChain::class.java)
            filter.doFilter(request, response, chain)
            assertThat(response.status).isEqualTo(401)
            Mockito.verifyNoInteractions(chain)
        }
    }

    @Test
    fun `valid gateway credential forwards without reading the upload body`() {
        val now = Instant.now()
        val token = SignedJwt(SECRET).issue("gateway", "persons-person", "gateway", now, now.plusSeconds(60))
        val request = MockHttpServletRequest("POST", "/v1/persons")
        request.addHeader("X-Gateway-Authorization", "Bearer $token")
        val response = MockHttpServletResponse()
        val chain = Mockito.mock(jakarta.servlet.FilterChain::class.java)
        filter.doFilter(request, response, chain)
        Mockito.verify(chain).doFilter(request, response)
    }

    @Test
    fun `health checks do not need gateway credentials`() {
        val request = MockHttpServletRequest("GET", "/actuator/health")
        val response = MockHttpServletResponse()
        val chain = Mockito.mock(jakarta.servlet.FilterChain::class.java)
        filter.doFilter(request, response, chain)
        Mockito.verify(chain).doFilter(request, response)
    }
}
