package com.persons.person.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "person_achievements")
class PersonAchievementEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var personId: UUID = UUID.randomUUID(),
    var achievementId: UUID = UUID.randomUUID(),
    var assignedBy: UUID? = null,
    var assignedAt: Instant = Instant.now(),
    var note: String = "",
)
