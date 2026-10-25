package com.persons.person.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "person_tags")
class TagEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var personId: UUID = UUID.randomUUID(),
    var label: String = "",
    var position: Int = 0,
)
