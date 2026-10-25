package com.persons.personworker.dao

import com.persons.leetify.domain.CsPlayerMatch
import com.persons.person.maintenance.dao.entity.LeetifySyncEntity
import com.persons.person.maintenance.games.CsMatchStore
import com.persons.personworker.domain.LeetifySettings
import com.persons.personworker.domain.LeetifySyncCandidate
import com.persons.personworker.domain.LeetifySyncLease
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Duration
import java.util.UUID
import com.persons.person.maintenance.dao.repository.LeetifySyncStateRepository as LeetifySyncRows

@Service
class LeetifySyncRepository(
    private val entityManager: EntityManager,
    private val rows: LeetifySyncRows,
    private val matches: CsMatchStore,
    private val candidates: GameSyncCandidates,
    private val clock: Clock,
) {
    fun candidates(settings: LeetifySettings, limit: Int): List<LeetifySyncCandidate> =
        candidates.select(LeetifySyncEntity::class.java, settings.importFrom, settings.pollInterval, limit, false)
            .stream().map { LeetifySyncCandidate(it.first, it.second) }.toList()

    @Transactional
    fun claim(candidate: LeetifySyncCandidate, settings: LeetifySettings): LeetifySyncLease? {
        if (!candidates.linked(candidate.personId, candidate.sourceUrl, true)) {
            return null
        }
        val now = clock.instant()
        val row = rows.findById(candidate.personId).orElse(null) ?: LeetifySyncEntity(
            personId = candidate.personId, sourceUrl = candidate.sourceUrl, importFrom = settings.importFrom,
        )
        val until = row.leaseUntil
        val retry = row.retryAt
        val completed = row.lastCompletedAt
        if ((until != null && !until.isBefore(now)) ||
            (retry != null && retry.isAfter(now)) ||
            (
                completed != null &&
                    completed.isAfter(now.minus(settings.pollInterval)) &&
                    row.sourceUrl == candidate.sourceUrl &&
                    row.importFrom == settings.importFrom
                )
        ) {
            return null
        }
        val token = UUID.randomUUID()
        row.sourceUrl = candidate.sourceUrl
        row.importFrom = settings.importFrom
        row.leaseToken = token
        row.leaseUntil = now.plus(Duration.ofMinutes(10))
        rows.saveAndFlush(row)
        return LeetifySyncLease(candidate.personId, candidate.sourceUrl, token, settings.importFrom)
    }

    // The lease, archive update and profile validation timestamp form one transaction.
    @Transactional
    fun complete(lease: LeetifySyncLease, records: List<CsPlayerMatch>) {
        val row = entityManager.find(LeetifySyncEntity::class.java, lease.personId, LockModeType.PESSIMISTIC_WRITE)
        val until = row?.leaseUntil
        if (row == null ||
            row.leaseToken != lease.token ||
            until == null ||
            until.isBefore(clock.instant()) ||
            !candidates.linked(lease.personId, lease.sourceUrl)
        ) {
            return
        }
        if (row.snapshotSourceUrl != lease.sourceUrl) {
            matches.delete(lease.personId)
        }
        matches.merge(lease.personId, records)
        row.snapshotSourceUrl = lease.sourceUrl
        row.lastCompletedAt = clock.instant()
        row.leaseToken = null
        row.leaseUntil = null
        row.retryAt = null
        row.lastError = null
        rows.saveAndFlush(row)
    }

    @Transactional
    fun failed(lease: LeetifySyncLease, code: String, retry: Duration, removeSnapshot: Boolean = false) {
        val row = entityManager.find(LeetifySyncEntity::class.java, lease.personId, LockModeType.PESSIMISTIC_WRITE)
        if (row == null || row.leaseToken != lease.token) {
            return
        }
        if (removeSnapshot) {
            matches.delete(lease.personId)
            row.snapshotSourceUrl = null
        }
        row.leaseToken = null
        row.leaseUntil = null
        row.lastError = code.take(80)
        row.retryAt = clock.instant().plus(retry)
        rows.saveAndFlush(row)
    }
}
