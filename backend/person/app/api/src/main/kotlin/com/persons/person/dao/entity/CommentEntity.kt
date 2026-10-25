package com.persons.person.dao.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "person_comments")
class CommentEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var personId: UUID = UUID.randomUUID(),
    var momentId: UUID? = null,
    var mediaId: UUID? = null,
    var authorId: UUID = UUID.randomUUID(),
    var authorName: String = "",
    @Column(columnDefinition = "text") var text: String = "",
    var deleted: Boolean = false,
    var createdAt: Instant = Instant.now(),
    var published: Boolean = true,
)
