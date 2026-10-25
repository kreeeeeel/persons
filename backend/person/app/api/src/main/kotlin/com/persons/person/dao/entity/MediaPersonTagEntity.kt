package com.persons.person.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "media_person_tags")
class MediaPersonTagEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var mediaId: UUID = UUID.randomUUID(),
    var personId: UUID = UUID.randomUUID(),
)
