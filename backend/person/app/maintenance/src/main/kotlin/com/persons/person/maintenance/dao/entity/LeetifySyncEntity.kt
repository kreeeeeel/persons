package com.persons.person.maintenance.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "person_leetify_sync")
class LeetifySyncEntity(
    @Id var personId: UUID = UUID.randomUUID(),
    var sourceUrl: String = "",
    var snapshotSourceUrl: String? = null,
    var importFrom: Instant = Instant.now(),
    var lastCompletedAt: Instant? = null,
    var retryAt: Instant? = null,
    var leaseToken: UUID? = null,
    var leaseUntil: Instant? = null,
    var lastError: String? = null,
)
