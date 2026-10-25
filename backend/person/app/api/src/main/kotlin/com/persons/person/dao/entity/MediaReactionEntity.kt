package com.persons.person.dao.entity

import com.persons.person.domain.ReactionKind
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "media_reactions")
class MediaReactionEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var mediaId: UUID = UUID.randomUUID(),
    var userId: UUID = UUID.randomUUID(),
    @Enumerated(EnumType.STRING) var reaction: ReactionKind = ReactionKind.LIKE,
    var createdAt: Instant = Instant.now(),
    var authorName: String = "",
)
