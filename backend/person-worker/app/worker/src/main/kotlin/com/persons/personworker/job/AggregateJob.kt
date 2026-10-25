package com.persons.personworker.job

import com.persons.personworker.component.AggregateProcessor
import com.persons.personworker.dao.AggregateRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

private const val BATCH_SIZE = 100

@Component
class AggregateJob(private val rows: AggregateRepository, private val processor: AggregateProcessor) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelayString = "\${jobs.aggregates-delay}")
    fun run() {
        rows.candidates(BATCH_SIZE).stream().forEach { id ->
            try {
                processor.recalculate(id)
            } catch (exception: Exception) {
                logger.error("Aggregate calculation failed for {}; queued work will retry", id, exception)
            }
        }
    }
}
