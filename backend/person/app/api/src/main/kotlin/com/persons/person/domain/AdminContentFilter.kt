package com.persons.person.domain

import com.persons.person.contract.dto.AdminContentKind
import com.persons.person.contract.dto.AdminContentStatus
import java.time.Instant
import java.util.UUID

data class AdminContentFilter(
    val kind: AdminContentKind? = null,
    val status: AdminContentStatus? = null,
    val query: String = "",
    val authorId: UUID? = null,
    val personId: UUID? = null,
    val createdFrom: Instant? = null,
    val createdTo: Instant? = null,
)
