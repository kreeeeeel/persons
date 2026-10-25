package com.persons.id.service.impl

import com.persons.id.component.SecureTokens
import com.persons.id.dao.entity.OAuthFlowEntity
import com.persons.id.dao.repository.OAuthFlowRepository
import com.persons.id.exception.impl.InvalidOAuthException
import com.persons.id.exception.impl.TooManyAttemptsException
import com.persons.id.service.OAuthFlowService
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

private const val FLOW_LIFETIME_SECONDS = 600L
private const val MAX_ACTIVE_FLOWS = 10000L

@Service
class OAuthFlowServiceImpl(
    private val repository: OAuthFlowRepository,
    private val entityManager: EntityManager,
    private val tokens: SecureTokens,
    private val clock: Clock,
) : OAuthFlowService {
    override fun begin(provider: String, binding: String, locale: String): Pair<String, String> {
        if (repository.count() >= MAX_ACTIVE_FLOWS) {
            throw TooManyAttemptsException()
        }

        val state = tokens.token()
        val verifier = tokens.token()

        repository.save(
            OAuthFlowEntity(
                stateHash = tokens.hash(state),
                bindingHash = tokens.hash(binding),
                provider = provider,
                verifier = verifier,
                locale = locale,
                expiresAt = clock.instant().plusSeconds(FLOW_LIFETIME_SECONDS),
            ),
        )

        return state to verifier
    }

    @Transactional
    override fun consume(provider: String, state: String, binding: String): OAuthFlowEntity {
        // Consume the callback once, including when requests arrive concurrently.
        val flow = entityManager.find(OAuthFlowEntity::class.java, tokens.hash(state), LockModeType.PESSIMISTIC_WRITE)

        if (flow == null ||
            flow.consumed ||
            flow.provider != provider ||
            !flow.expiresAt.isAfter(clock.instant()) ||
            !tokens.matches(binding, flow.bindingHash)
        ) {
            throw InvalidOAuthException()
        }

        flow.consumed = true

        return repository.save(flow)
    }

    @Scheduled(fixedDelayString = "\${project.oauth.cleanup-delay-ms:600000}")
    @Transactional
    fun cleanup() {
        repository.deleteByExpiresAtBefore(clock.instant())
    }
}
