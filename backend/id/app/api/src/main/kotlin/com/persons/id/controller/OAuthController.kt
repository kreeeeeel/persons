package com.persons.id.controller

import com.persons.id.contract.dto.OAuthAuthorization
import com.persons.id.contract.dto.OAuthComplete
import com.persons.id.contract.dto.OAuthStart
import com.persons.id.contract.dto.SessionToken
import com.persons.id.oauth.OAuthCoordinator
import com.persons.id.transformer.toDto
import com.persons.requestobservability.RequestMetadata
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Component

@Component
class OAuthController(
    private val oauth: OAuthCoordinator,
    private val metadata: RequestMetadata,
    private val request: HttpServletRequest,
) {
    fun beginOAuth(provider: String, start: OAuthStart): ResponseEntity<OAuthAuthorization> = ResponseEntity.ok(
        OAuthAuthorization(java.net.URI.create(oauth.begin(provider, start.browserBinding, start.locale.value))),
    )

    fun completeOAuth(provider: String, complete: OAuthComplete): ResponseEntity<SessionToken> =
        ResponseEntity.status(HttpStatus.CREATED).body(
            oauth.complete(provider, complete.state, complete.browserBinding, complete.code, metadata.client(request))
                .toDto(),
        )
}
