package com.persons.personworker.dao

import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.StorageGarbageEntity
import com.persons.person.domain.MediaStatus
import com.persons.person.maintenance.dao.repository.MediaQualityRepository
import com.persons.person.maintenance.dao.repository.MediaRecordRepository
import com.persons.person.maintenance.dao.repository.MediaTranscodeJobRepository
import com.persons.person.maintenance.dao.repository.StorageGarbageRecordRepository
import com.persons.personworker.domain.GarbageObject
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID

@Service
class MediaGarbageRepository(
    private val entityManager: EntityManager,
    private val media: MediaRecordRepository,
    private val garbage: StorageGarbageRecordRepository,
    private val qualities: MediaQualityRepository,
    private val jobs: MediaTranscodeJobRepository,
    private val clock: Clock,
) {
    fun qualities(id: UUID): List<String> =
        qualities.findByMediaIdOrderByHeightDesc(id).stream().map { it.objectKey }.toList()
    fun media(before: Instant, limit: Int): List<UUID> = media.findAll(
        eligibleMedia(before),
        PageRequest.of(0, limit, Sort.by("createdAt", "id")),
    ).content.stream().map { it.id }.toList()
    fun garbage(before: Instant, limit: Int): List<UUID> = garbage.findAll(
        eligibleGarbage(before),
        PageRequest.of(0, limit, Sort.by("createdAt", "id")),
    ).content.stream().map { it.id }.toList()

    fun claim(id: UUID, before: Instant, obsolete: Boolean): GarbageObject? {
        if (obsolete) {
            val row = entityManager.find(
                StorageGarbageEntity::class.java,
                id,
                LockModeType.PESSIMISTIC_WRITE,
                mapOf("jakarta.persistence.lock.timeout" to -2),
            )
            if (row == null ||
                !garbage.exists(
                    Specification<StorageGarbageEntity> { root, _, builder ->
                        builder.equal(root.get<UUID>("id"), id)
                    }.and(eligibleGarbage(before)),
                )
            ) {
                return null
            }
            return GarbageObject(id, row.objectKey, null)
        }
        val row = entityManager.find(
            MediaEntity::class.java,
            id,
            LockModeType.PESSIMISTIC_WRITE,
            mapOf("jakarta.persistence.lock.timeout" to -2),
        )
        if (row == null ||
            !media.exists(
                Specification<MediaEntity> { root, _, builder ->
                    builder.equal(root.get<UUID>("id"), id)
                }.and(eligibleMedia(before)),
            )
        ) {
            return null
        }
        return GarbageObject(id, row.objectKey, row.previewObjectKey)
    }

    fun removed(id: UUID, obsolete: Boolean) {
        if (obsolete) {
            garbage.deleteById(id)
            garbage.flush()
        } else {
            qualities.deleteByMediaId(id)
            jobs.deleteById(id)
            val row = media.findById(id).orElse(null)
            if (row != null) {
                row.status = MediaStatus.PURGED
                media.saveAndFlush(row)
            }
        }
    }

    private fun eligibleMedia(before: Instant): Specification<MediaEntity> = Specification { row, query, builder ->
        if (query == null) {
            throw IllegalStateException("Media eligibility requires a criteria query")
        }
        val retired = query.subquery(UUID::class.java)
        val person = retired.from(PersonEntity::class.java)
        retired.select(person.get("id")).where(
            builder.equal(person.get<UUID>("id"), row.get<UUID>("personId")),
            builder.isTrue(person.get("deleted")), builder.lessThanOrEqualTo(person.get("deletedAt"), retainedBefore()),
        )
        builder.and(
            builder.notEqual(row.get<MediaStatus>("status"), MediaStatus.PURGED),
            builder.or(
                builder.and(
                    builder.equal(row.get<MediaStatus>("status"), MediaStatus.DELETED),
                    builder.lessThanOrEqualTo(row.get("deletedAt"), retainedBefore()),
                ),
                builder.and(
                    builder.equal(row.get<MediaStatus>("status"), MediaStatus.STAGED),
                    builder.lessThan(row.get("createdAt"), before),
                ),
                builder.exists(retired),
            ),
        )
    }

    private fun eligibleGarbage(before: Instant): Specification<StorageGarbageEntity> = Specification {
            row,
            _,
            builder,
        ->
        builder.or(
            builder.and(
                builder.isNull(row.get<Instant>("retiredAt")),
                builder.lessThan(
                    row.get("createdAt"),
                    before,
                ),
            ),

            builder.lessThanOrEqualTo(row.get("retiredAt"), retainedBefore()),
        )
    }

    private fun retainedBefore(): Instant = clock.instant().atOffset(ZoneOffset.UTC).minusYears(5).toInstant()
}
