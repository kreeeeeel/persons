package com.persons.person.component

import com.persons.id.client.configuration.IdMainClientFactory
import com.persons.id.client.generated.model.AccountRole
import com.persons.person.configuration.properties.InternalProperties
import com.persons.person.domain.Actor
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.InvalidInputException
import com.persons.person.exception.impl.UnauthorizedException
import com.persons.person.exception.impl.UnavailableException
import com.persons.requestobservability.SignedJwt
import jakarta.servlet.http.HttpServletRequest
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClientRequestException
import org.springframework.web.reactive.function.client.WebClientResponseException
import java.time.Duration
import java.util.UUID
import java.util.stream.Collectors

private const val AUTHORIZATION = "Authorization"
private const val SERVICE_AUTHORIZATION = "X-Service-Authorization"
private const val BEARER = "Bearer "
private const val INTERNAL_AUDIENCE = "persons-internal"
private const val SERVICE_SCOPE = "service"
private const val USER_LOOKUP_LIMIT = 100
private const val UPSTREAM_TIMEOUT_SECONDS = 10L

@Component
class ActorResolver(
    private val factory: IdMainClientFactory,
    private val request: HttpServletRequest,
    private val properties: InternalProperties,
) {
    fun optional(): Actor? = identity()

    fun identity(): Actor? {
        val token = sessionToken() ?: return null

        return try {
            val user = factory.create({ properties.jwtSecret }, { token }).api.getMe()
                .block(Duration.ofSeconds(UPSTREAM_TIMEOUT_SECONDS)) ?: throw UnavailableException()
            val name = listOf(user.firstName, user.lastName).stream().filter { it.isNotBlank() }
                .collect(Collectors.joining(" "))

            Actor(user.id, name, user.role == AccountRole.ADMIN)
        } catch (exception: WebClientResponseException) {
            if (exception.statusCode.value() in setOf(401, 403)) null else throw UnavailableException(cause = exception)
        } catch (exception: WebClientRequestException) {
            throw UnavailableException(cause = exception)
        }
    }

    fun required(): Actor = optional() ?: throw UnauthorizedException()

    fun administrator(): Actor {
        val actor = required()

        if (!actor.administrator) {
            throw ForbiddenException()
        }

        return actor
    }

    fun accountId(email: String): UUID {
        administrator()
        val result = try {
            factory.create({ properties.jwtSecret }, { sessionToken() }).admin
                .listAdminUsers(0, USER_LOOKUP_LIMIT, email)
                .block(Duration.ofSeconds(UPSTREAM_TIMEOUT_SECONDS)) ?: throw UnavailableException()
        } catch (exception: WebClientResponseException) {
            throw UnavailableException(cause = exception)
        } catch (exception: WebClientRequestException) {
            throw UnavailableException(cause = exception)
        }

        return result.items.stream().filter { it.email.equals(email, ignoreCase = true) }
            .findFirst().orElseThrow { InvalidInputException() }.id
    }

    fun requireService() {
        val token = request.getHeader(SERVICE_AUTHORIZATION).orEmpty().removePrefix(BEARER)

        if (SignedJwt(properties.jwtSecret).verify(token, INTERNAL_AUDIENCE, SERVICE_SCOPE) == null) {
            throw UnauthorizedException()
        }
    }

    private fun sessionToken(): String? {
        val header = request.getHeader(AUTHORIZATION).orEmpty()

        if (header.isEmpty()) {
            return null
        }
        if (!header.startsWith(BEARER) || header.length == BEARER.length) {
            throw UnauthorizedException()
        }

        return header.removePrefix(BEARER)
    }
}
