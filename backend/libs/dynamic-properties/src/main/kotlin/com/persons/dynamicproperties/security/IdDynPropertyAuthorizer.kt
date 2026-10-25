package com.persons.dynamicproperties.security

import com.persons.dynamicproperties.exception.DynPropertyException
import com.persons.id.client.configuration.IdMainClientFactory
import com.persons.id.client.generated.model.AccountRole
import com.persons.requestobservability.SignedJwt
import jakarta.servlet.http.HttpServletRequest
import org.springframework.web.reactive.function.client.WebClientRequestException
import org.springframework.web.reactive.function.client.WebClientResponseException
import java.time.Duration

class IdDynPropertyAuthorizer(
    private val factory: IdMainClientFactory,
    private val request: HttpServletRequest,
    private val secret: String,
) : DynPropertyAuthorizer {
    override fun administrator(): String {
        val header = request.getHeader("Authorization").orEmpty()
        if (!header.startsWith("Bearer ") || header.length <= 7) throw DynPropertyException("UNAUTHORIZED")
        val user =
            try {
                factory
                    .create({ secret }, { header.removePrefix("Bearer ") })
                    .api
                    .getMe()
                    .block(Duration.ofSeconds(10))
                    ?: throw DynPropertyException("UNAVAILABLE")
            } catch (exception: WebClientResponseException) {
                throw DynPropertyException(
                    if (exception.statusCode.value() in setOf(401, 403)) "UNAUTHORIZED" else "UNAVAILABLE",
                    exception,
                )
            } catch (exception: WebClientRequestException) {
                throw DynPropertyException("UNAVAILABLE", exception)
            }
        if (user.role != AccountRole.ADMIN) throw DynPropertyException("FORBIDDEN")
        return user.id.toString()
    }

    override fun service(): String {
        val token = request.getHeader("X-Service-Authorization").orEmpty().removePrefix("Bearer ")
        return SignedJwt(secret).verify(token, "persons-internal", "service")?.subject
            ?: throw DynPropertyException("UNAUTHORIZED")
    }
}
