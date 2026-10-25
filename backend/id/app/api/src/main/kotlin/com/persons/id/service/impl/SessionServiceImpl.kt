package com.persons.id.service.impl

import com.persons.id.component.SecureTokens
import com.persons.id.component.SessionTokens
import com.persons.id.configuration.properties.IdProperties
import com.persons.id.dao.entity.SessionEntity
import com.persons.id.dao.repository.SessionRepository
import com.persons.id.domain.Account
import com.persons.id.domain.AccountStatus
import com.persons.id.domain.IssuedSession
import com.persons.id.domain.SessionInfo
import com.persons.id.service.AccountService
import com.persons.id.service.SessionService
import com.persons.id.transformer.toSessionInfo
import com.persons.idcontext.SessionRequiredException
import com.persons.idcontext.SessionVerifier
import com.persons.idcontext.UserPrincipal
import com.persons.requestobservability.ClientMetadata
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

private const val EXPIRES = 86400L
private const val PLUS_SECONDS = 60L
private const val MINUS_SECONDS = 60L
private const val RENEWAL_WINDOW_DAYS = 7L
private const val PREVIOUS_TOKEN_GRACE_SECONDS = 60L
private const val SHORT_SESSION_WINDOW_DIVISOR = 2L

@Service
class SessionServiceImpl(
    private val repository: SessionRepository,
    private val accounts: AccountService,
    private val tokens: SecureTokens,
    private val jwt: SessionTokens,
    private val properties: IdProperties,
    private val clock: Clock,
) : SessionService,
    SessionVerifier {
    override fun issue(account: Account, client: ClientMetadata): IssuedSession {
        val sessionId = UUID.randomUUID()
        val now = clock.instant()
        val issuedAt = now.truncatedTo(ChronoUnit.SECONDS)
        val expires = issuedAt.plusSeconds(properties.sessionDays * EXPIRES)
        val token = jwt.issue(account.id, sessionId, expires, issuedAt)

        repository.save(
            SessionEntity(
                id = sessionId,
                userId = account.id,
                tokenHash = tokens.hash(token),
                tokenIssuedAt = issuedAt,
                createdAt = now,
                lastSeenAt = now,
                expiresAt = expires,
                ip = client.ip,
                userAgent = client.userAgent,
                os = client.os,
                osVersion = client.osVersion,
                browser = client.browser,
                device = client.device,
                origin = client.origin,
                region = client.region,
            ),
        )

        return IssuedSession(token, expires, account)
    }

    override fun verify(token: String): UserPrincipal {
        val identity = jwt.identity(token)
        val session = repository.findById(identity.second).orElse(null)

        if (session == null ||
            session.userId != identity.first ||
            !matches(token, session, clock.instant()) ||
            session.revoked ||
            !session.expiresAt.isAfter(clock.instant())
        ) {
            throw SessionRequiredException()
        }

        val account = accounts.get(session.userId)
        if (account.status != AccountStatus.ACTIVE) {
            throw SessionRequiredException()
        }

        val now = clock.instant()

        if (session.lastSeenAt.plusSeconds(PLUS_SECONDS).isBefore(now)) {
            repository.touch(session.id, now, now.minusSeconds(MINUS_SECONDS))
        }

        return UserPrincipal(account.id, session.id, account.email, account.locale, session.expiresAt)
    }

    @Transactional
    override fun refresh(user: UserPrincipal, token: String, client: ClientMetadata): IssuedSession {
        val session = repository.lock(user.sessionId)
        val now = clock.instant()
        if (session == null ||
            session.userId != user.userId ||
            session.revoked ||
            !session.expiresAt.isAfter(now) ||
            !matches(token, session, now)
        ) {
            throw SessionRequiredException()
        }
        val account = accounts.get(user.userId)
        if (account.status != AccountStatus.ACTIVE) {
            throw SessionRequiredException()
        }
        if (session.ip == client.ip && client.region.isNotBlank()) {
            session.region = client.region
        }
        val renewalWindow = minOf(
            RENEWAL_WINDOW_DAYS * EXPIRES,
            properties.sessionDays * EXPIRES / SHORT_SESSION_WINDOW_DIVISOR,
        )
        if (session.expiresAt.isAfter(now.plusSeconds(renewalWindow))) {
            val current = if (tokens.matches(token, session.tokenHash)) {
                token
            } else {
                jwt.issue(account.id, session.id, session.expiresAt, session.tokenIssuedAt)
            }
            return IssuedSession(current, session.expiresAt, account)
        }
        val issuedAt = now.truncatedTo(ChronoUnit.SECONDS)
        val expiresAt = issuedAt.plusSeconds(properties.sessionDays * EXPIRES)
        val renewed = jwt.issue(account.id, session.id, expiresAt, issuedAt)
        session.previousTokenHash = session.tokenHash
        session.previousTokenValidUntil = now.plusSeconds(PREVIOUS_TOKEN_GRACE_SECONDS)
        session.tokenHash = tokens.hash(renewed)
        session.tokenIssuedAt = issuedAt
        session.expiresAt = expiresAt
        session.lastSeenAt = now
        return IssuedSession(renewed, expiresAt, account)
    }

    private fun matches(token: String, session: SessionEntity, now: Instant): Boolean =
        tokens.matches(token, session.tokenHash) ||
            (
                session.previousTokenHash?.let { tokens.matches(token, it) } == true &&
                    session.previousTokenValidUntil?.isAfter(now) == true
                )

    override fun list(user: UserPrincipal): List<SessionInfo> = repository.findActiveByUser(
        user.userId,
        clock.instant(),
    ).stream().map { it.toSessionInfo(user.sessionId) }.toList()

    override fun revoke(user: UserPrincipal, id: UUID) {
        val session = repository.findById(id).orElse(null)

        if (session == null || session.userId != user.userId) {
            throw SessionRequiredException()
        }

        session.revoked = true
        repository.save(session)
    }

    @Transactional
    override fun revokeOthers(user: UserPrincipal) {
        repository.findActiveByUser(user.userId, clock.instant()).stream().filter { it.id != user.sessionId }.forEach {
            it.revoked = true
            repository.save(it)
        }
    }
}
