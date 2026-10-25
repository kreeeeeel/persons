package com.persons.personworker.component

import com.persons.personworker.dao.AggregateRepository
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.util.UUID

@Component
class AggregateProcessor(
    private val rows: AggregateRepository,
    private val calculator: ReputationCalculator,
    private val clock: Clock,
) {
    @Transactional
    fun recalculate(id: UUID) {
        if (!rows.claim(id)) return
        val input = rows.input(id)
        rows.save(id, input, calculator.calculate(input), clock.instant())
    }
}
