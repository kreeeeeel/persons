package com.persons.personworker

import com.persons.person.maintenance.AggregateReputation
import com.persons.personworker.component.ReputationCalculator
import com.persons.personworker.domain.AggregateInput
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource

class ReputationCalculatorTest {
    @ParameterizedTest
    @CsvSource(
        "0,0,0,0,UNKNOWN", "1,1,0,0,BAD", "1,2.6,0,0,AVERAGE", "1,3.8,0,0,GOOD",
        "0,0,1,0,BAD", "0,0,1,65,AVERAGE", "0,0,1,100,GOOD",
        "2,3,1,100,GOOD", "2,5,1,0,AVERAGE", "2,1,1,100,AVERAGE", "2,1,1,25,BAD",
    )
    fun `combines ratings and approved loans and renormalizes missing sources`(
        ratings: Long,
        average: Double,
        loans: Long,
        loanAverage: Double,
        expected: AggregateReputation,
    ) {
        assertThat(ReputationCalculator().calculate(AggregateInput(ratings, average, loans, loanAverage, 0)))
            .isEqualTo(expected)
    }
}
