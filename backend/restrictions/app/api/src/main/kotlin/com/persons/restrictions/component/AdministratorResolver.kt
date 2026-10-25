package com.persons.restrictions.component

import com.persons.id.client.configuration.IdMainClientFactory
import com.persons.id.client.generated.model.AccountRole
import com.persons.restrictions.configuration.properties.InternalProperties
import com.persons.restrictions.domain.Administrator
import com.persons.restrictions.exception.impl.ForbiddenException
import com.persons.restrictions.exception.impl.UnauthorizedException
import com.persons.restrictions.exception.impl.UnavailableException
import jakarta.servlet.http.HttpServletRequest
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClientRequestException
import org.springframework.web.reactive.function.client.WebClientResponseException
import java.time.Duration

private const val AUTHORIZATION = "Authorization"
private const val BEARER = "Bearer "
private val UPSTREAM_TIMEOUT = Duration.ofSeconds(5)

@Component
class AdministratorResolver(
    private val factory: IdMainClientFactory,
    private val properties: InternalProperties,
    private val request: HttpServletRequest,
) {
    fun required(): Administrator {
        val header = request.getHeader(AUTHORIZATION).orEmpty()
        if (!header.startsWith(BEARER) || header.length == BEARER.length) throw UnauthorizedException()
        val user = try {
            factory.create({
                properties.jwtSecret
            }, { header.removePrefix(BEARER) }).api.getMe().block(UPSTREAM_TIMEOUT)
        } catch (exception: WebClientResponseException) {
            if (exception.statusCode.value() in setOf(401, 403)) throw UnauthorizedException(exception)
            throw UnavailableException(exception)
        } catch (exception: WebClientRequestException) {
            throw UnavailableException(exception)
        }
        if (user == null) throw UnavailableException()
        if (user.role != AccountRole.ADMIN) throw ForbiddenException()
        return Administrator(user.id)
    }
}
