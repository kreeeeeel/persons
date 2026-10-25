package com.persons.gateway.component

import com.persons.gateway.configuration.properties.InternalProperties
import com.persons.gateway.exception.impl.InvalidInputException
import com.persons.gateway.exception.impl.UnauthorizedException
import com.persons.person.contract.dto.RestrictionScope
import com.persons.requestobservability.SignedJwt
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.servlet.HandlerInterceptor

private const val SERVICE_HEADER = "X-Service-Authorization"
private const val BEARER = "Bearer "
private const val INTERNAL_AUDIENCE = "persons-internal"
private const val SERVICE_SCOPE = "service"

@Component
class GatewayInterceptor(
    private val properties: InternalProperties,
    private val actors: ActorResolver,
    private val restrictions: RestrictionsGateway,
    private val policy: RoutePolicy,
) : HandlerInterceptor {
    override fun preHandle(request: HttpServletRequest, response: HttpServletResponse, handler: Any): Boolean {
        val header = request.getHeader(SERVICE_HEADER).orEmpty()
        val token = header.removePrefix(BEARER)
        if (!header.startsWith(BEARER) ||
            SignedJwt(properties.jwtSecret).verify(token, INTERNAL_AUDIENCE, SERVICE_SCOPE) == null
        ) {
            throw UnauthorizedException()
        }
        val upstream = request.requestURI.substringAfter('/').substringBefore('/')
        val path = request.requestURI.removePrefix("/$upstream")
        if (path.contains("//") ||
            path.split('/').contains("..") ||
            path.contains(';') ||
            path.contains('\\') ||
            path.contains('%')
        ) {
            throw InvalidInputException()
        }
        if (upstream == "id" && path.startsWith("/internal/")) throw UnauthorizedException()
        if (policy.bypassAccountCheck(upstream, request.method, path)) return true
        val scope = if (upstream == "person") policy.scope(request.method, path) else RestrictionScope.ACCOUNT
        val actor = actors.optional()
        if (actor != null) restrictions.ensure(actor.id, scope)
        return true
    }
}
