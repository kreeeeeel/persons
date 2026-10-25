package com.persons.id.service.impl

import com.persons.id.component.SecureTokens
import com.persons.id.configuration.properties.IdProperties
import com.persons.id.dao.entity.ChallengeEntity
import com.persons.id.dao.entity.NotificationEntity
import com.persons.id.dao.repository.ChallengeRepository
import com.persons.id.dao.repository.NotificationRepository
import com.persons.id.domain.ChallengeStatus
import com.persons.id.domain.PreparedNotification
import com.persons.id.domain.RegistrationDetails
import com.persons.id.domain.VerificationGrant
import com.persons.id.exception.IdException
import com.persons.id.exception.impl.ExpiredChallengeException
import com.persons.id.exception.impl.InvalidCodeException
import com.persons.id.exception.impl.OperationFailedException
import com.persons.id.exception.impl.ResendTooEarlyException
import com.persons.id.exception.impl.TooManyAttemptsException
import com.persons.id.service.ChallengeService
import com.persons.id.service.NotificationService
import org.slf4j.MDC
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate
import java.time.Clock
import java.time.Instant
import java.util.UUID

private const val RATE_LIMIT_WINDOW_SECONDS = 900L
private const val MAX_RECENT_REQUESTS_PER_IP = 10
private const val MINUS_SECONDS_LIMIT = 900L
private const val BEGIN_LIMIT = 5
private const val CHALLENGE = 60L
private const val UPDATED_1 = 1
private const val UPDATED_60 = 60L
private const val ERROR = 1
private const val PLUS_SECONDS = 3600L
private const val CHALLENGE_SENDS_LIMIT = 5

@Service
class ChallengeServiceImpl(
    private val repository: ChallengeRepository,
    private val outbox: NotificationRepository,
    private val notifications: NotificationService,
    private val tokens: SecureTokens,
    private val properties: IdProperties,
    private val transactions: TransactionTemplate,
    private val clock: Clock,
) : ChallengeService {
    override fun begin(details: RegistrationDetails, purpose: String, ip: String, userId: UUID?): ChallengeStatus {
        val now = clock.instant()

        if (repository.countRecentByIp(
                ip,
                now.minusSeconds(RATE_LIMIT_WINDOW_SECONDS),
            ) >=
            MAX_RECENT_REQUESTS_PER_IP ||
            repository.countRecentByEmail(details.email, now.minusSeconds(MINUS_SECONDS_LIMIT)) >=
            BEGIN_LIMIT
        ) {
            throw TooManyAttemptsException()
        }

        val id = UUID.randomUUID()
        val code = tokens.code()
        val message = notifications.prepare(details.email, details.locale, code, purpose)
        val challenge = ChallengeEntity(
            id = id,
            email = details.email,
            firstName = details.firstName,
            lastName = details.lastName,
            patronymic = details.patronymic,
            locale = details.locale,
            purpose = purpose,
            userId = userId,
            codeHash = tokens.hash("$id:$code"),
            ip = ip,
            createdAt = now,
            expiresAt = now.plusSeconds(properties.challengeMinutes * CHALLENGE),
            resendAt = now.plusSeconds(properties.resendSeconds),
        )

        transactions.executeWithoutResult {
            repository.save(challenge)
            enqueue(message, challenge.expiresAt)
        }

        return ChallengeStatus(id, challenge.expiresAt, challenge.resendAt)
    }

    override fun resend(id: UUID): ChallengeStatus {
        val snapshot = repository.findById(id).orElse(null)

        if (snapshot == null) {
            throw ExpiredChallengeException()
        }

        validateResend(snapshot)

        val code = tokens.code()
        val message = notifications.prepare(snapshot.email, snapshot.locale, code, snapshot.purpose)
        val updated = transactions.execute {
            val challenge = locked(id)

            validateResend(challenge)
            challenge.codeHash = tokens.hash("$id:$code")
            challenge.proofHash = null
            challenge.sends += UPDATED_1
            challenge.expiresAt = clock.instant().plusSeconds(properties.challengeMinutes * UPDATED_60)
            challenge.resendAt = clock.instant().plusSeconds(properties.resendSeconds)

            val saved = repository.save(challenge)

            enqueue(message, saved.expiresAt)
            ChallengeStatus(saved.id, saved.expiresAt, saved.resendAt)
        }

        if (updated == null) {
            throw OperationFailedException()
        }

        return updated
    }

    override fun verify(id: UUID, code: String): VerificationGrant {
        val grant = tokens.token()
        var expires = clock.instant()
        val error = transactions.execute<IdException?> {
            val challenge = locked(id)

            expires = challenge.expiresAt

            if (challenge.consumed || !challenge.expiresAt.isAfter(clock.instant())) {
                ExpiredChallengeException()
            } else if (challenge.attempts >= properties.maxCodeAttempts) {
                TooManyAttemptsException()
            } else if (!tokens.matches("$id:$code", challenge.codeHash)) {
                challenge.attempts += ERROR
                repository.save(challenge)
                InvalidCodeException()
            } else {
                challenge.proofHash = tokens.hash(grant)
                repository.save(challenge)
                null
            }
        }

        if (error != null) {
            throw error
        }

        return VerificationGrant(grant, expires)
    }

    @Transactional(propagation = Propagation.MANDATORY)
    override fun consume(id: UUID, grant: String, purpose: String, userId: UUID?): RegistrationDetails {
        val challenge = locked(id)
        val proof = challenge.proofHash

        if (challenge.consumed ||
            challenge.purpose != purpose ||
            challenge.userId != userId ||
            !challenge.expiresAt.isAfter(clock.instant()) ||
            proof == null ||
            !tokens.matches(grant, proof)
        ) {
            throw ExpiredChallengeException()
        }

        challenge.consumed = true
        repository.save(challenge)

        return RegistrationDetails(
            challenge.firstName,
            challenge.lastName,
            challenge.patronymic,
            challenge.email,
            challenge.locale,
        )
    }

    private fun validateResend(challenge: ChallengeEntity) {
        if (challenge.consumed || challenge.createdAt.plusSeconds(PLUS_SECONDS).isBefore(clock.instant())) {
            throw ExpiredChallengeException()
        }
        if (challenge.sends >= CHALLENGE_SENDS_LIMIT || challenge.attempts >= properties.maxCodeAttempts) {
            throw TooManyAttemptsException()
        }
        if (challenge.resendAt.isAfter(clock.instant())) {
            throw ResendTooEarlyException()
        }
    }

    private fun locked(id: UUID): ChallengeEntity {
        val challenge = repository.findLocked(id)

        if (challenge == null) {
            throw ExpiredChallengeException()
        }

        return challenge
    }

    private fun enqueue(message: PreparedNotification, expiresAt: Instant) {
        outbox.save(
            NotificationEntity(
                recipient = message.recipient,
                subject = message.subject,
                html = message.html,
                requestId = MDC.get("requestId") ?: UUID.randomUUID().toString(),
                expiresAt = expiresAt,
            ),
        )
    }
}
