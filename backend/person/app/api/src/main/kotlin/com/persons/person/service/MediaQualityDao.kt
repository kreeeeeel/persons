package com.persons.person.service

import com.persons.person.dao.entity.MediaEntity
import com.persons.person.domain.MediaQualityFile
import com.persons.person.maintenance.dao.entity.MediaTranscodeJobEntity
import com.persons.person.maintenance.dao.repository.MediaQualityRepository
import com.persons.person.maintenance.dao.repository.MediaTranscodeJobRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class MediaQualityDao(
    private val entityManager: EntityManager,
    private val jobs: MediaTranscodeJobRepository,
    private val qualities: MediaQualityRepository,
) {
    // Locking the parent serializes idempotent enqueue with concurrent requests.
    fun enqueue(id: UUID, now: Instant) {
        if (entityManager.find(
                MediaEntity::class.java,
                id,
                LockModeType.PESSIMISTIC_WRITE,
            ) != null &&
            !jobs.existsById(id)
        ) {
            jobs.save(MediaTranscodeJobEntity(mediaId = id, updatedAt = now))
        }
    }

    fun files(id: UUID): List<MediaQualityFile> = qualities.findByMediaIdOrderByHeightDesc(id).stream().map {
        MediaQualityFile(it.height, it.width, it.objectKey, it.sizeBytes)
    }.toList()

    fun processing(id: UUID): Boolean {
        val job = jobs.findById(id).orElse(null)
        return job == null || job.status in setOf("QUEUED", "RUNNING")
    }
}
