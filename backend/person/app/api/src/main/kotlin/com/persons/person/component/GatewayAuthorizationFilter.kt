package com.persons.person.component

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.configuration.properties.GatewayProperties
import com.persons.person.contract.dto.ClientErrorResponse
import com.persons.requestobservability.SignedJwt
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.MDC
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

private const val AUTHORIZATION_HEADER = "X-Gateway-Authorization"
private const val BEARER = "Bearer "
private const val AUDIENCE = "persons-person"
private const val SCOPE = "gateway"
private const val REQUEST_ID = "requestId"
private const val UNAUTHORIZED = "UNAUTHORIZED"
private const val HEALTH_PATH = "/actuator/health"

@Component
class GatewayAuthorizationFilter(private val properties: GatewayProperties, private val mapper: ObjectMapper) :
    OncePerRequestFilter() {
    override fun shouldNotFilter(request: HttpServletRequest): Boolean =
        !properties.enforced || request.requestURI == HEALTH_PATH || request.requestURI.startsWith("$HEALTH_PATH/")

    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, chain: FilterChain) {
        val header = request.getHeader(AUTHORIZATION_HEADER).orEmpty()
        if (!header.startsWith(BEARER) ||
            SignedJwt(properties.jwtSecret).verify(header.removePrefix(BEARER), AUDIENCE, SCOPE) == null
        ) {
            response.status = HttpStatus.UNAUTHORIZED.value()
            response.contentType = MediaType.APPLICATION_JSON_VALUE
            mapper.writeValue(response.writer, ClientErrorResponse(UNAUTHORIZED, MDC.get(REQUEST_ID).orEmpty()))
            return
        }
        chain.doFilter(request, response)
    }
}
