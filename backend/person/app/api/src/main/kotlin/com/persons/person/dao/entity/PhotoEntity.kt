package com.persons.person.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "person_photos")
class PhotoEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var personId: UUID = UUID.randomUUID(),
    var mediaId: UUID = UUID.randomUUID(),
    var authorId: UUID = UUID.randomUUID(),
    var title: String = "",
    var deleted: Boolean = false,
    var createdAt: Instant = Instant.now(),
)
