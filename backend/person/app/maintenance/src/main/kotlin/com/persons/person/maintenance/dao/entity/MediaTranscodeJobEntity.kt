package com.persons.person.maintenance.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "media_transcode_jobs")
class MediaTranscodeJobEntity(
    @Id var mediaId: UUID = UUID.randomUUID(),
    var status: String = "QUEUED",
    var attempts: Int = 0,
    var leaseToken: UUID? = null,
    var updatedAt: Instant = Instant.now(),
)
