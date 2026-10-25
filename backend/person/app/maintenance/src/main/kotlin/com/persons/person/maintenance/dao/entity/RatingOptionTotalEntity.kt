package com.persons.person.maintenance.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.IdClass
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "person_rating_option_totals")
@IdClass(RatingOptionTotalId::class)
class RatingOptionTotalEntity(
    @Id var personId: UUID = UUID.randomUUID(),
    @Id var optionId: UUID = UUID.randomUUID(),
    var votes: Long = 0,
)
