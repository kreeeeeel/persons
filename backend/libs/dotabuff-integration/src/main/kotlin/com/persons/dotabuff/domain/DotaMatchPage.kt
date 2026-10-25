package com.persons.dotabuff.domain

data class DotaMatchPage(
    val matches: List<DotaMatchReference>,
    val hasNext: Boolean,
)
