package com.persons.restrictions.domain

import java.time.Instant
import java.util.UUID

data class Restriction(
    val id: UUID,
    val userId: UUID,
    val scopes: Set<RestrictionScope>,
    val reason: String,
    val createdBy: UUID,
    val createdAt: Instant,
    val expiresAt: Instant?,
    val revoked: Boolean,
    val revision: Long,
) {
    fun effective(now: Instant): Boolean = !revoked && (expiresAt == null || expiresAt.isAfter(now))
}
