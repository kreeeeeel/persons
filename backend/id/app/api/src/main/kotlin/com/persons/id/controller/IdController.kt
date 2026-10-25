package com.persons.id.controller

import com.persons.id.component.EnrollmentCoordinator
import com.persons.id.contract.api.V1Api
import com.persons.id.contract.dto.Challenge
import com.persons.id.contract.dto.CompleteRecovery
import com.persons.id.contract.dto.CompleteRegistration
import com.persons.id.contract.dto.Credentials
import com.persons.id.contract.dto.Recovery
import com.persons.id.contract.dto.Register
import com.persons.id.contract.dto.SessionToken
import com.persons.id.contract.dto.Sessions
import com.persons.id.contract.dto.User
import com.persons.id.contract.dto.Verification
import com.persons.id.contract.dto.Verify
import com.persons.id.domain.RegistrationDetails
import com.persons.id.service.AccountService
import com.persons.id.service.ChallengeService
import com.persons.id.service.SessionService
import com.persons.id.transformer.toDomain
import com.persons.id.transformer.toDto
import com.persons.idcontext.RequireUser
import com.persons.idcontext.UserContext
import com.persons.requestobservability.RequestMetadata
import jakarta.servlet.http.HttpServletRequest
import org.springframework.core.io.ByteArrayResource
import org.springframework.core.io.Resource
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

private const val HTTP_CREATED = 201
private const val REGISTER = "REGISTER"
private const val RECOVER = "RECOVER"
private const val AUTHORIZATION_HEADER = "Authorization"
private const val BEARER_PREFIX = "Bearer "

@RestController
class IdController(
    private val oauth: OAuthController,
    private val accounts: AccountService,
    private val enrollment: EnrollmentCoordinator,
    private val challenges: ChallengeService,
    private val sessions: SessionService,
    private val context: UserContext,
    private val metadata: RequestMetadata,
    private val request: HttpServletRequest,
) : V1Api {
    override fun beginOAuth(
        provider: String,
        oauthStart: com.persons.id.contract.dto.OAuthStart,
    ): ResponseEntity<com.persons.id.contract.dto.OAuthAuthorization> = oauth.beginOAuth(provider, oauthStart)

    override fun completeOAuth(
        provider: String,
        oauthComplete: com.persons.id.contract.dto.OAuthComplete,
    ): ResponseEntity<SessionToken> = oauth.completeOAuth(provider, oauthComplete)

    override fun beginRegistration(register: Register): ResponseEntity<Challenge> {
        val details = register.toDomain()

        accounts.ensureAvailable(details)

        return ResponseEntity.accepted().body(challenges.begin(details, REGISTER, metadata.client(request).ip).toDto())
    }

    override fun beginRecovery(recovery: Recovery): ResponseEntity<Challenge> = ResponseEntity.accepted().body(
        challenges.begin(
            RegistrationDetails("", "", null, recovery.email.trim().lowercase(), recovery.locale.value),
            RECOVER,
            metadata.client(request).ip,
        ).toDto(),
    )

    override fun verifyChallenge(id: UUID, verify: Verify): ResponseEntity<Verification> =
        ResponseEntity.ok(challenges.verify(id, verify.code).toDto())

    override fun resendChallenge(id: UUID): ResponseEntity<Challenge> =
        ResponseEntity.accepted().body(challenges.resend(id).toDto())

    override fun completeRegistration(completeRegistration: CompleteRegistration): ResponseEntity<SessionToken> =
        ResponseEntity.status(HTTP_CREATED).body(
            enrollment.complete(
                completeRegistration.challengeId,
                completeRegistration.grant,
                completeRegistration.password,
                completeRegistration.avatarBase64,
                metadata.client(request),
            ).toDto(),
        )

    override fun completeRecovery(completeRecovery: CompleteRecovery): ResponseEntity<Unit> {
        accounts.recover(completeRecovery.challengeId, completeRecovery.grant, completeRecovery.password)

        return ResponseEntity.noContent().build()
    }

    override fun createSession(credentials: Credentials): ResponseEntity<SessionToken> {
        val client = metadata.client(request)
        val account = accounts.authenticate(credentials.email, credentials.password, client.ip)

        return ResponseEntity.status(HTTP_CREATED).body(sessions.issue(account, client).toDto())
    }

    @RequireUser
    override fun refreshSession(): ResponseEntity<SessionToken> = ResponseEntity.ok(
        sessions.refresh(
            context.current(),
            request.getHeader(AUTHORIZATION_HEADER).removePrefix(BEARER_PREFIX),
            metadata.client(request),
        ).toDto(),
    )

    @RequireUser
    override fun getMe(): ResponseEntity<User> = ResponseEntity.ok(accounts.get(context.current().userId).toDto())

    @RequireUser
    override fun getAvatar(): ResponseEntity<Resource> = ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG)
        .header("Cache-Control", "private, no-store").body(ByteArrayResource(accounts.avatar(context.current().userId)))

    @RequireUser
    override fun listSessions(): ResponseEntity<Sessions> =
        ResponseEntity.ok(Sessions(sessions.list(context.current()).stream().map { it.toDto() }.toList()))

    @RequireUser
    override fun revokeSession(id: UUID): ResponseEntity<Unit> {
        sessions.revoke(context.current(), id)

        return ResponseEntity.noContent().build()
    }

    @RequireUser
    override fun revokeOtherSessions(): ResponseEntity<Unit> {
        sessions.revokeOthers(context.current())

        return ResponseEntity.noContent().build()
    }
}
