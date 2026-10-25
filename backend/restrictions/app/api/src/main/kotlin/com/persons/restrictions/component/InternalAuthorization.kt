package com.persons.restrictions.component

import com.persons.requestobservability.SignedJwt
import com.persons.restrictions.configuration.properties.InternalProperties
import com.persons.restrictions.exception.impl.UnauthorizedException
import jakarta.servlet.http.HttpServletRequest
import org.springframework.stereotype.Component

private const val HEADER = "X-Service-Authorization"
private const val BEARER = "Bearer "
private const val AUDIENCE = "persons-internal"
private const val SCOPE = "service"

@Component
class InternalAuthorization(private val request: HttpServletRequest, private val properties: InternalProperties) {
    fun requireService() {
        val header = request.getHeader(HEADER).orEmpty()
        if (!header.startsWith(BEARER) ||
            SignedJwt(properties.jwtSecret).verify(header.removePrefix(BEARER), AUDIENCE, SCOPE) == null
        ) {
            throw UnauthorizedException()
        }
    }
}
