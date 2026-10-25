package com.persons.person.maintenance.dao.entity

import com.persons.person.maintenance.AggregateReputation
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "person_aggregates")
class PersonAggregateEntity(
    @Id var personId: UUID = UUID.randomUUID(),
    var ratingCount: Long = 0,
    var ratingAverage: Double = 0.0,
    var loanCount: Long = 0,
    var loanScore: Long = 0,
    @Enumerated(EnumType.STRING) var reputation: AggregateReputation = AggregateReputation.UNKNOWN,
    var calculatedAt: Instant = Instant.now(),
)
