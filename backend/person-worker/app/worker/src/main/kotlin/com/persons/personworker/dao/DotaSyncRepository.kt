package com.persons.personworker.dao

import com.persons.dotabuff.domain.DotaPlayerMatch
import com.persons.person.maintenance.dao.entity.DotaSyncEntity
import com.persons.person.maintenance.games.DotaMatchStore
import com.persons.personworker.domain.DotaSyncCandidate
import com.persons.personworker.domain.DotaSyncLease
import com.persons.personworker.domain.DotabuffSettings
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.Comparator
import com.persons.person.maintenance.dao.repository.DotaSyncStateRepository as DotaSyncRows

@Service
class DotaSyncRepository(
    private val entityManager: EntityManager,
    private val rows: DotaSyncRows,
    private val matches: DotaMatchStore,
    private val candidates: GameSyncCandidates,
    private val clock: Clock,
) {
    fun candidates(settings: DotabuffSettings, limit: Int): List<DotaSyncCandidate> =
        candidates.select(DotaSyncEntity::class.java, settings.importFrom, settings.pollInterval, limit, true)
            .stream().map { DotaSyncCandidate(it.first, it.second) }.toList()

    // The person lock makes initialization and claiming atomic across replicas.
    @Transactional
    fun claim(candidate: DotaSyncCandidate, settings: DotabuffSettings): DotaSyncLease? {
        if (!candidates.linked(candidate.personId, candidate.sourceUrl, true)) {
            return null
        }
        val now = clock.instant()
        val state = rows.findById(candidate.personId).orElse(null) ?: DotaSyncEntity(
            personId = candidate.personId, sourceUrl = candidate.sourceUrl,
            importFrom = settings.importFrom, scanFrom = settings.importFrom,
        )
        val completed = state.lastCompletedAt
        val until = state.leaseUntil
        val retry = state.retryAt
        if ((until != null && !until.isBefore(now)) ||
            (retry != null && retry.isAfter(now)) ||
            (
                completed != null &&
                    completed.isAfter(now.minus(settings.pollInterval)) &&
                    state.nextPage == 1 &&
                    state.sourceUrl == candidate.sourceUrl &&
                    state.importFrom == settings.importFrom
                )
        ) {
            return null
        }
        if (state.sourceUrl != candidate.sourceUrl || state.importFrom != settings.importFrom) {
            state.nextPage = 1
            state.scanFrom = settings.importFrom
            state.newestMatchAt = null
            if (state.sourceUrl != candidate.sourceUrl) {
                state.accountId = null
            }
        }
        val token = java.util.UUID.randomUUID()
        state.sourceUrl = candidate.sourceUrl
        state.importFrom = settings.importFrom
        state.leaseToken = token
        state.leaseUntil = now.plus(Duration.ofMinutes(10))
        rows.saveAndFlush(state)
        return DotaSyncLease(
            candidate.personId, candidate.sourceUrl, token, state.accountId,
            state.importFrom, state.scanFrom, state.nextPage, state.newestMatchAt,
        )
    }

    // Imported matches and the cursor commit only while the same lease and Steam link are current.
    @Transactional
    fun complete(
        lease: DotaSyncLease,
        account: Long,
        records: List<DotaPlayerMatch>,
        latest: Instant?,
        hasNext: Boolean,
    ) {
        val state = entityManager.find(DotaSyncEntity::class.java, lease.personId, LockModeType.PESSIMISTIC_WRITE)
        val until = state?.leaseUntil
        if (state == null ||
            state.leaseToken != lease.token ||
            until == null ||
            until.isBefore(clock.instant()) ||
            !candidates.linked(lease.personId, lease.sourceUrl)
        ) {
            return
        }
        records.stream().forEach { matches.insert(lease.personId, it) }
        val newest = listOfNotNull(lease.newestMatchAt, latest).stream().max(Comparator.naturalOrder()).orElse(null)
        state.accountId = account
        state.nextPage = if (hasNext) lease.nextPage + 1 else 1
        state.scanFrom = if (hasNext) {
            lease.scanFrom
        } else {
            listOfNotNull(
                lease.importFrom,
                newest?.minus(Duration.ofDays(1)),
            )
                .stream().max(Comparator.naturalOrder()).orElse(lease.importFrom)
        }
        state.newestMatchAt = newest
        if (!hasNext) {
            state.lastCompletedAt = clock.instant()
        }
        state.leaseToken = null
        state.leaseUntil = null
        state.retryAt = null
        state.lastError = null
        rows.saveAndFlush(state)
    }

    @Transactional
    fun failed(lease: DotaSyncLease, code: String, retry: Duration) {
        val state = entityManager.find(DotaSyncEntity::class.java, lease.personId, LockModeType.PESSIMISTIC_WRITE)
        if (state != null && state.leaseToken == lease.token) {
            state.leaseToken = null
            state.leaseUntil = null
            state.lastError = code.take(80)
            state.retryAt = clock.instant().plus(retry)
            rows.saveAndFlush(state)
        }
    }
}
