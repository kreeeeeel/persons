package com.persons.dynamicproperties.domain

data class DynChange(
    val records: List<DynRecord> = emptyList(),
    val removed: Set<String> = emptySet(),
    val fullSnapshot: Boolean = false,
    val revision: Long = records.maxOfOrNull { it.revision } ?: -1L,
)
