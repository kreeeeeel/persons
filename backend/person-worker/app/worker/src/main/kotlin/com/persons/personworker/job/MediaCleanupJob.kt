package com.persons.personworker.job

import com.persons.personworker.component.MediaGarbageProcessor
import com.persons.personworker.dao.MediaGarbageRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.UUID

private const val BATCH_SIZE = 50
private val RETENTION = Duration.ofDays(1)

@Component
class MediaCleanupJob(
    private val rows: MediaGarbageRepository,
    private val processor: MediaGarbageProcessor,
    private val clock: Clock,
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelayString = "\${jobs.media-delay}")
    fun run() {
        val before = clock.instant().minus(RETENTION)
        rows.media(before, BATCH_SIZE).stream().forEach { clean(it, before, false) }
        rows.garbage(before, BATCH_SIZE).stream().forEach { clean(it, before, true) }
    }

    private fun clean(id: UUID, before: Instant, obsolete: Boolean) {
        try {
            processor.purge(id, before, obsolete)
        } catch (exception: Exception) {
            logger.error("S3 cleanup failed for {}; deletion will retry", id, exception)
        }
    }
}
