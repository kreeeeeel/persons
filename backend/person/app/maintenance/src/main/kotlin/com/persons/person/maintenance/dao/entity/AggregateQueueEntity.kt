package com.persons.person.maintenance.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "person_aggregate_queue")
class AggregateQueueEntity(@Id var personId: UUID = UUID.randomUUID(), var requestedAt: Instant = Instant.now())
