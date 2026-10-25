package com.persons.id.component

import com.persons.id.configuration.properties.IdProperties
import com.persons.idcontext.SessionRequiredException
import com.persons.requestobservability.SignedJwt
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.Instant
import java.util.UUID

@Component
class SessionTokens(properties: IdProperties, private val clock: Clock) {
    private val tokens = SignedJwt(properties.jwtSecret)

    fun issue(userId: UUID, sessionId: UUID, expiresAt: Instant, issuedAt: Instant = clock.instant()): String =
        tokens.issue(userId.toString(), "persons-api", "session", issuedAt, expiresAt, sessionId.toString())

    fun identity(token: String): Pair<UUID, UUID> {
        val claims = tokens.verify(token, "persons-api", "session", clock.instant())

        if (claims == null) {
            throw SessionRequiredException()
        }

        return try {
            UUID.fromString(claims.subject) to UUID.fromString(claims.jwtid)
        } catch (exception: IllegalArgumentException) {
            throw SessionRequiredException()
        }
    }
}
