package com.persons.person.dao.entity

import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "person_media")
class MediaEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var personId: UUID = UUID.randomUUID(),
    var uploaderId: UUID = UUID.randomUUID(),
    var uploaderName: String = "",
    @Enumerated(EnumType.STRING) var kind: MediaKind = MediaKind.PHOTO,
    @Enumerated(EnumType.STRING) var status: MediaStatus = MediaStatus.STAGED,
    var objectKey: String = "",
    var contentType: String = "",
    var sizeBytes: Long = 0,
    var caption: String = "",
    var durationSeconds: Double = 0.0,
    var previewObjectKey: String? = null,
    var previewContentType: String? = null,
    var previewSize: Long? = null,
    var createdAt: Instant = Instant.now(),
    var deletedAt: Instant? = null,
)
