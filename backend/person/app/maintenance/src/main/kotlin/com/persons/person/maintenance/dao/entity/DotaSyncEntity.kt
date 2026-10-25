package com.persons.person.maintenance.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "person_dota_sync")
class DotaSyncEntity(
    @Id var personId: UUID = UUID.randomUUID(),
    var sourceUrl: String = "",
    var accountId: Long? = null,
    var importFrom: Instant = Instant.now(),
    var scanFrom: Instant = Instant.now(),
    var nextPage: Int = 1,
    var newestMatchAt: Instant? = null,
    var lastCompletedAt: Instant? = null,
    var retryAt: Instant? = null,
    var leaseToken: UUID? = null,
    var leaseUntil: Instant? = null,
    var lastError: String? = null,
)
