package com.persons.gateway.component

import com.persons.gateway.configuration.properties.InternalProperties
import com.persons.gateway.domain.Actor
import com.persons.gateway.exception.impl.ForbiddenException
import com.persons.gateway.exception.impl.UnauthorizedException
import com.persons.gateway.exception.impl.UnavailableException
import com.persons.id.client.configuration.IdMainClientFactory
import com.persons.id.client.generated.model.AccountRole
import jakarta.servlet.http.HttpServletRequest
import org.springframework.stereotype.Component
import org.springframework.web.context.annotation.RequestScope
import org.springframework.web.reactive.function.client.WebClientRequestException
import org.springframework.web.reactive.function.client.WebClientResponseException
import java.time.Duration

private const val AUTHORIZATION = "Authorization"
private const val BEARER = "Bearer "
private val UPSTREAM_TIMEOUT = Duration.ofSeconds(10)

@Component
@RequestScope
class ActorResolver(
    private val factory: IdMainClientFactory,
    private val properties: InternalProperties,
    private val request: HttpServletRequest,
) {
    private var resolved = false
    private var actor: Actor? = null

    fun sessionToken(): String? {
        val header = request.getHeader(AUTHORIZATION).orEmpty()
        if (header.isEmpty()) return null
        if (!header.startsWith(BEARER) || header.length == BEARER.length) throw UnauthorizedException()
        return header.removePrefix(BEARER)
    }

    fun optional(): Actor? {
        if (resolved) return actor
        val token = sessionToken()
        if (token == null) {
            resolved = true
            return null
        }
        val user = try {
            factory.create({ properties.jwtSecret }, { token }).api.getMe().block(UPSTREAM_TIMEOUT)
        } catch (exception: WebClientResponseException) {
            if (exception.statusCode.value() in setOf(401, 403)) {
                resolved = true
                return null
            }
            throw UnavailableException(exception)
        } catch (exception: WebClientRequestException) {
            throw UnavailableException(exception)
        }
        if (user == null) throw UnavailableException()
        actor = Actor(user.id, user.role == AccountRole.ADMIN)
        resolved = true
        return actor
    }

    fun required(): Actor {
        val current = optional()
        if (current == null) throw UnauthorizedException()
        return current
    }

    fun administrator(): Actor {
        val current = required()
        if (!current.administrator) throw ForbiddenException()
        return current
    }
}
