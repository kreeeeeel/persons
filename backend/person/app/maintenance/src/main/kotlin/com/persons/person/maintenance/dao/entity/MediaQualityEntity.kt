package com.persons.person.maintenance.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.IdClass
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "media_qualities")
@IdClass(MediaQualityId::class)
class MediaQualityEntity(
    @Id var mediaId: UUID = UUID.randomUUID(),
    @Id var height: Int = 0,
    var width: Int = 0,
    var objectKey: String = "",
    var sizeBytes: Long = 0,
)
