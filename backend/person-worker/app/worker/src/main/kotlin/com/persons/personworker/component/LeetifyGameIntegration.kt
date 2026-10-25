package com.persons.personworker.component

import com.persons.dotabuff.SteamAccountResolver
import com.persons.dotabuff.exception.DotabuffException
import com.persons.leetify.LeetifyClient
import com.persons.leetify.exception.LeetifyException
import com.persons.personworker.dao.LeetifySyncRepository
import com.persons.personworker.domain.GameIntegration
import com.persons.personworker.domain.LeetifySyncLease
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.time.Duration

private const val STEAM_BASE = 76561197960265728L

@Component
class LeetifyGameIntegration(
    private val settings: LeetifySettingsProvider,
    private val states: LeetifySyncRepository,
    private val resolver: SteamAccountResolver,
    private val client: LeetifyClient,
) : GameIntegration {
    override val key = "leetify"
    override val enabled: Boolean get() = settings.leetify().enabled
    override val interval: Duration get() = settings.leetify().pollInterval
    private val log = LoggerFactory.getLogger(javaClass)

    override fun synchronize() {
        val current = settings.leetify()
        if (!current.enabled) {
            return
        }
        states.candidates(current, 5).stream().forEach { candidate ->
            val lease = states.claim(candidate, current)
            if (lease != null) {
                synchronize(lease)
            }
        }
    }

    private fun synchronize(lease: LeetifySyncLease) {
        try {
            val steamId = (STEAM_BASE + resolver.resolve(lease.sourceUrl)).toString()
            val records = client.matches(steamId).stream()
                .filter {
                    !it.playedAt.isBefore(lease.importFrom)
                }.toList()
            states.complete(lease, records)
            log.info("Leetify synchronization completed for page {}: {} matches stored", lease.personId, records.size)
        } catch (exception: LeetifyException) {
            states.failed(
                lease, exception.code, exception.retryAfter ?: Duration.ofMinutes(5),
                exception.code in setOf("PROFILE_PRIVATE", "HTTP_404"),
            )
            log.warn("Leetify synchronization failed for page {}: {}", lease.personId, exception.code)
        } catch (exception: DotabuffException) {
            states.failed(lease, exception.code, exception.retryAfter ?: Duration.ofMinutes(5))
            log.warn("Steam resolution failed for page {}: {}", lease.personId, exception.code)
        } catch (exception: RuntimeException) {
            states.failed(lease, "INTERNAL_ERROR", Duration.ofMinutes(5))
            throw exception
        }
    }
}
