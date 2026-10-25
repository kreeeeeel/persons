package com.persons.personworker.domain

data class AggregateInput(
    val ratingCount: Long,
    val ratingAverage: Double,
    val loanCount: Long,
    val loanAverage: Double,
    val loanScore: Long,
)
