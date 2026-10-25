package com.persons.person.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDate
import java.util.UUID

@Entity
@Table(name = "person_views")
class ProfileViewEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var personId: UUID = UUID.randomUUID(),
    var visitorHash: String = "",
    var viewDate: LocalDate = LocalDate.now(),
)
