package com.persons.person.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "person_rating_options")
class RatingOptionEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var personId: UUID = UUID.randomUUID(),
    var emoji: String = "",
    var label: String = "",
    var position: Int = 0,
    var enabled: Boolean = true,
)
