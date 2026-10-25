package com.persons.personworker.dao

import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.StorageGarbageEntity
import com.persons.person.domain.MediaStatus
import com.persons.person.maintenance.dao.entity.MediaQualityEntity
import com.persons.person.maintenance.dao.entity.MediaQualityId
import com.persons.person.maintenance.dao.entity.MediaTranscodeJobEntity
import com.persons.person.maintenance.dao.repository.MediaQualityRepository
import com.persons.person.maintenance.dao.repository.MediaRecordRepository
import com.persons.person.maintenance.dao.repository.MediaTranscodeJobRepository
import com.persons.person.maintenance.dao.repository.PersonRecordRepository
import com.persons.person.maintenance.dao.repository.StorageGarbageRecordRepository
import com.persons.personworker.domain.VideoWork
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.UUID

private const val MAX_ATTEMPTS = 3
private val LEASE = Duration.ofHours(1)
private val RETRY_DELAY = Duration.ofMinutes(5)

@Service
class VideoWorkRepository(
    private val entityManager: EntityManager,
    private val jobs: MediaTranscodeJobRepository,
    private val media: MediaRecordRepository,
    private val persons: PersonRecordRepository,
    private val qualities: MediaQualityRepository,
    private val garbage: StorageGarbageRecordRepository,
    private val clock: Clock,
) {
    // Job selection and claim share one transaction and a skip-locked write lock.
    @Transactional
    fun claim(now: Instant): VideoWork? {
        expireExhausted(now)
        val builder = entityManager.criteriaBuilder
        val query = builder.createQuery(MediaTranscodeJobEntity::class.java)
        val job = query.from(MediaTranscodeJobEntity::class.java)
        val file = query.from(MediaEntity::class.java)
        val person = query.from(PersonEntity::class.java)
        query.select(job).where(
            builder.equal(job.get<UUID>("mediaId"), file.get<UUID>("id")),
            builder.equal(file.get<UUID>("personId"), person.get<UUID>("id")), builder.isFalse(person.get("deleted")),
            file.get<MediaStatus>("status").`in`(MediaStatus.PENDING, MediaStatus.PUBLISHED),
            builder.lessThan(job.get("attempts"), MAX_ATTEMPTS),
            builder.or(
                builder.equal(job.get<String>("status"), "QUEUED"),
                builder.and(
                    builder.equal(job.get<String>("status"), "FAILED"),
                    builder.lessThan(job.get("updatedAt"), now.minus(RETRY_DELAY)),
                ),
                builder.and(
                    builder.equal(job.get<String>("status"), "RUNNING"),
                    builder.lessThan(job.get("updatedAt"), now.minus(LEASE)),
                ),
            ),
        )
            .orderBy(builder.asc(job.get<Instant>("updatedAt")), builder.asc(job.get<UUID>("mediaId")))
        val candidate = entityManager.createQuery(query).setLockMode(LockModeType.PESSIMISTIC_WRITE)
            .setHint("jakarta.persistence.lock.timeout", -2).setMaxResults(1).resultList.firstOrNull()
        if (candidate == null) {
            return null
        }
        candidate.status = "RUNNING"
        candidate.attempts += 1
        candidate.updatedAt = now
        val token = UUID.randomUUID()
        candidate.leaseToken = token
        jobs.saveAndFlush(candidate)
        return VideoWork(candidate.mediaId, media.getReferenceById(candidate.mediaId).objectKey, token)
    }

    fun current(work: VideoWork): Boolean = active(work, false) != null

    fun prepare(key: String) {
        if (!garbage.existsByObjectKey(key)) {
            garbage.saveAndFlush(StorageGarbageEntity(objectKey = key, createdAt = clock.instant()))
        }
    }

    // The current lease, quality upsert and retirement of the old object commit together.
    @Transactional
    fun save(work: VideoWork, height: Int, width: Int, key: String, size: Long) {
        val job = active(work, true)
        if (job == null) {
            return
        }
        val previous = qualities.findById(MediaQualityId(work.id, height)).orElse(null)
        if (previous != null && previous.objectKey != key) {
            prepare(previous.objectKey)
        }
        qualities.save(MediaQualityEntity(work.id, height, width, key, size))
        garbage.deleteByObjectKey(key)
        job.updatedAt = clock.instant()
        jobs.saveAndFlush(job)
    }

    @Transactional
    fun metadata(work: VideoWork, duration: Double, previewKey: String, previewSize: Long) {
        val job = active(work, true)
        if (job == null) {
            return
        }
        val row = media.getReferenceById(work.id)
        val previous = row.previewObjectKey
        if (previous != null && previous != previewKey) {
            prepare(previous)
        }
        row.durationSeconds = duration
        row.previewObjectKey = previewKey
        row.previewContentType = "image/jpeg"
        row.previewSize = previewSize
        garbage.deleteByObjectKey(previewKey)
        job.updatedAt = clock.instant()
        media.save(row)
        jobs.saveAndFlush(job)
    }

    @Transactional
    fun finish(work: VideoWork, success: Boolean, now: Instant) {
        val job = entityManager.find(
            MediaTranscodeJobEntity::class.java,
            work.id,
            LockModeType.PESSIMISTIC_WRITE,
            mapOf("jakarta.persistence.lock.timeout" to -2),
        )
        if (job != null && job.leaseToken == work.token) {
            job.status = if (success) "DONE" else "FAILED"
            job.updatedAt = now
            jobs.saveAndFlush(job)
        }
    }

    private fun active(work: VideoWork, locked: Boolean): MediaTranscodeJobEntity? {
        val job = if (locked) {
            entityManager.find(
                MediaTranscodeJobEntity::class.java,
                work.id,
                LockModeType.PESSIMISTIC_WRITE,
                mapOf("jakarta.persistence.lock.timeout" to -2),
            )
        } else {
            jobs.findById(work.id).orElse(null)
        }
        if (job == null || job.leaseToken != work.token || job.status != "RUNNING") {
            return null
        }
        val file = media.findById(work.id).orElse(null)
        if (file == null || file.status !in setOf(MediaStatus.PENDING, MediaStatus.PUBLISHED)) {
            return null
        }
        val person = persons.findById(file.personId).orElse(null)
        return if (person == null || person.deleted) null else job
    }

    private fun expireExhausted(now: Instant) {
        jobs.findAll { row, _, builder ->
            builder.and(
                builder.equal(row.get<String>("status"), "RUNNING"), builder.ge(row.get("attempts"), MAX_ATTEMPTS),
                builder.lessThan(row.get("updatedAt"), now.minus(LEASE)),
            )
        }.stream().forEach { job ->
            job.status = "FAILED"
            job.updatedAt = now
        }
        jobs.flush()
    }
}
