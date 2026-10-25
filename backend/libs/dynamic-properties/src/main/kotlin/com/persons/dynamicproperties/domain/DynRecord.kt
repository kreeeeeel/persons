package com.persons.dynamicproperties.domain

import java.time.Instant

data class DynRecord(
    val definition: DynSpec,
    val value: String,
    val revision: Long,
    val updatedAt: Instant,
    val updatedBy: String? = null,
)
