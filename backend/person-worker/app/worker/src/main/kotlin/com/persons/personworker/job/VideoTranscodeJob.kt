package com.persons.personworker.job

import com.persons.personworker.component.VideoTranscoder
import com.persons.personworker.dao.VideoWorkRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Clock

@Component
class VideoTranscodeJob(
    private val rows: VideoWorkRepository,
    private val transcoder: VideoTranscoder,
    private val clock: Clock,
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelayString = "\${jobs.video-delay}", initialDelayString = "\${jobs.video-initial-delay}")
    fun run() {
        val work = rows.claim(clock.instant()) ?: return
        try {
            transcoder.process(work)
            rows.finish(work, true, clock.instant())
        } catch (exception: Exception) {
            rows.finish(work, false, clock.instant())
            logger.error("Video {} could not be prepared; original remains available", work.id, exception)
        }
    }
}
