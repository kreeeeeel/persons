package com.persons.id.oauth

import com.persons.id.domain.IssuedSession
import com.persons.id.exception.impl.InvalidOAuthException
import com.persons.id.service.OAuthAccountService
import com.persons.id.service.OAuthFlowService
import com.persons.id.service.SessionService
import com.persons.requestobservability.ClientMetadata
import org.springframework.stereotype.Component

@Component
class OAuthCoordinator(
    private val providers: List<OAuthProvider>,
    private val flows: OAuthFlowService,
    private val accounts: OAuthAccountService,
    private val sessions: SessionService,
) {
    fun begin(providerId: String, binding: String, locale: String): String {
        val provider = provider(providerId)
        val flow = flows.begin(providerId, binding, locale)

        return provider.authorizationUrl(flow.first, flow.second)
    }

    fun complete(
        providerId: String,
        state: String,
        binding: String,
        code: String,
        client: ClientMetadata,
    ): IssuedSession {
        val provider = provider(providerId)
        val flow = flows.consume(providerId, state, binding)
        val identity = provider.identify(code, flow.verifier)
        val account = accounts.resolve(providerId, identity, flow.locale)

        return sessions.issue(account, client)
    }

    private fun provider(id: String): OAuthProvider {
        val provider = providers.stream().filter { it.id == id }.findFirst().orElse(null)

        if (provider == null) {
            throw InvalidOAuthException()
        }

        return provider
    }
}
