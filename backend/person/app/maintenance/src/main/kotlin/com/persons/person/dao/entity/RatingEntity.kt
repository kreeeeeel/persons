package com.persons.person.dao.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "person_ratings")
class RatingEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var personId: UUID = UUID.randomUUID(),
    var userId: UUID = UUID.randomUUID(),
    var optionId: UUID? = null,
    @Column(name = "rating_value") var value: Int = 5,
    var createdAt: Instant = Instant.now(),
    var emoji: String = "⭐",
    var authorName: String = "",
    @Column(columnDefinition = "text") var comment: String? = null,
)
