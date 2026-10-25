package com.persons.person.maintenance

import java.time.Instant

data class PersonAggregate(
    val ratingCount: Long = 0,
    val ratingAverage: Double = 0.0,
    val loanCount: Long = 0,
    val loanScore: Long = 0,
    val reputation: AggregateReputation = AggregateReputation.UNKNOWN,
    val calculatedAt: Instant? = null,
    val calculationPending: Boolean = calculatedAt == null,
)
