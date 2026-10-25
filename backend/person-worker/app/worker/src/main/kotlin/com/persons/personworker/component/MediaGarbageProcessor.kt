package com.persons.personworker.component

import com.persons.person.configuration.properties.S3Properties
import com.persons.personworker.dao.MediaGarbageRepository
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest
import java.time.Instant
import java.util.UUID

@Component
class MediaGarbageProcessor(
    private val rows: MediaGarbageRepository,
    private val s3: S3Client,
    private val properties: S3Properties,
) {
    @Transactional
    fun purge(id: UUID, before: Instant, obsolete: Boolean) {
        val row = rows.claim(id, before, obsolete) ?: return
        val keys = listOfNotNull(row.key, row.previewKey) + if (obsolete) emptyList() else rows.qualities(id)
        keys.stream().forEach { key ->
            s3.deleteObject(DeleteObjectRequest.builder().bucket(properties.bucket).key(key).build())
        }
        rows.removed(id, obsolete)
    }
}
