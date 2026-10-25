package com.persons.id.client.context

import com.persons.id.client.configuration.IdMainClientFactory
import com.persons.idcontext.SessionRequiredException
import com.persons.idcontext.SessionVerifier
import com.persons.idcontext.UserPrincipal
import org.springframework.web.reactive.function.client.WebClientResponseException

class RemoteSessionVerifier(private val factory: IdMainClientFactory, private val secret: String) : SessionVerifier {
    override fun verify(token: String): UserPrincipal {
        try {
            val principal = factory.create({ secret }, { token }).api.introspectSession().block()

            if (principal == null) {
                throw SessionRequiredException()
            }

            return UserPrincipal(
                principal.userId,
                principal.sessionId,
                principal.email,
                principal.locale,
                principal.expiresAt.toInstant(),
            )
        } catch (exception: WebClientResponseException.Unauthorized) {
            throw SessionRequiredException()
        }
    }
}
