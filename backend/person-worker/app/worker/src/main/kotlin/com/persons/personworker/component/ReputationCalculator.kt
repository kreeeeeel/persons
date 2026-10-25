package com.persons.personworker.component

import com.persons.person.maintenance.AggregateReputation
import com.persons.personworker.domain.AggregateInput
import org.springframework.stereotype.Component

private const val MIN_RATING = 1.0
private const val RATING_RANGE = 4.0
private const val PERCENT = 100.0
private const val RATING_WEIGHT = 0.6
private const val LOAN_WEIGHT = 0.4
private const val GOOD_THRESHOLD = 70.0
private const val BAD_THRESHOLD = 40.0

@Component
class ReputationCalculator {
    fun calculate(input: AggregateInput): AggregateReputation {
        if (input.ratingCount == 0L && input.loanCount == 0L) return AggregateReputation.UNKNOWN
        val rating = ((input.ratingAverage - MIN_RATING) / RATING_RANGE * PERCENT).coerceIn(0.0, PERCENT)
        val score = when {
            input.ratingCount == 0L -> input.loanAverage
            input.loanCount == 0L -> rating
            else -> rating * RATING_WEIGHT + input.loanAverage * LOAN_WEIGHT
        }
        return when {
            score >= GOOD_THRESHOLD -> AggregateReputation.GOOD
            score < BAD_THRESHOLD -> AggregateReputation.BAD
            else -> AggregateReputation.AVERAGE
        }
    }
}
