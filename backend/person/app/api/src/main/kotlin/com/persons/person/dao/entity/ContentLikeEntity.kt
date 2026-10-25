package com.persons.person.dao.entity

import com.persons.person.domain.ContentKind
import com.persons.person.domain.ReactionKind
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "content_likes")
class ContentLikeEntity(
    @Id var id: UUID = UUID.randomUUID(),
    @Enumerated(EnumType.STRING) var targetKind: ContentKind = ContentKind.COMMENT,
    var targetId: UUID = UUID.randomUUID(),
    var userId: UUID = UUID.randomUUID(),
    var createdAt: Instant = Instant.now(),
    @Enumerated(EnumType.STRING) var reaction: ReactionKind = ReactionKind.LIKE,
    var authorName: String = "",
)
