package com.persons.personworker.component

import com.persons.dotabuff.DotaClient
import com.persons.dotabuff.SteamAccountResolver
import com.persons.dotabuff.exception.DotabuffException
import com.persons.person.maintenance.games.DotaMatchStore
import com.persons.personworker.dao.DotaSyncRepository
import com.persons.personworker.domain.DotaSyncLease
import com.persons.personworker.domain.GameIntegration
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.time.Duration

private const val PROFILE_BATCH = 5

@Component
class DotabuffGameIntegration(
    private val settings: DotabuffSettingsProvider,
    private val states: DotaSyncRepository,
    private val matches: DotaMatchStore,
    private val resolver: SteamAccountResolver,
    private val client: DotaClient,
) : GameIntegration {
    override val key = "dotabuff"
    override val enabled: Boolean get() = settings.dotabuff().enabled
    override val interval: Duration get() = settings.dotabuff().pollInterval
    private val log = LoggerFactory.getLogger(javaClass)

    override fun synchronize() {
        val current = settings.dotabuff()
        if (!current.enabled) {
            return
        }
        states.candidates(current, PROFILE_BATCH).stream().forEach { candidate ->
            val lease = states.claim(candidate, current)
            if (lease != null) {
                synchronize(lease)
            }
        }
    }

    private fun synchronize(lease: DotaSyncLease) {
        try {
            val account = lease.accountId ?: resolver.resolve(lease.sourceUrl)
            val page = client.matches(account, lease.nextPage)
            val eligible = page.matches.stream()
                .filter {
                    !it.playedAt.isBefore(lease.scanFrom)
                }.toList()
            val known = matches.known(lease.personId, eligible.stream().map { it.matchId }.toList())
            val records = eligible.stream()
                .filter {
                    it.matchId !in known
                }.map {
                    client.match(account, it)
                }.toList()
            val newest = page.matches.stream().map { it.playedAt }.max(Comparator.naturalOrder()).orElse(null)
            states.complete(
                lease, account, records, newest,
                page.hasNext && eligible.size == page.matches.size && eligible.isNotEmpty(),
            )
            log.info(
                "OpenDota synchronization completed for page {}: {} matches imported", lease.personId, records.size,
            )
        } catch (exception: DotabuffException) {
            states.failed(lease, exception.code, exception.retryAfter ?: Duration.ofMinutes(5))
            log.warn("OpenDota synchronization failed for page {}: {}", lease.personId, exception.code)
        } catch (exception: RuntimeException) {
            states.failed(lease, "INTERNAL_ERROR", Duration.ofMinutes(5))
            throw exception
        }
    }
}
