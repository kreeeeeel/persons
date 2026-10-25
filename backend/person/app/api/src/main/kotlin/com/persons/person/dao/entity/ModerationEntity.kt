package com.persons.person.dao.entity

import com.persons.person.domain.ChangeKind
import com.persons.person.domain.ReviewStatus
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "moderation_requests")
class ModerationEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var personId: UUID = UUID.randomUUID(),
    var personTag: String = "",
    var targetId: UUID = UUID.randomUUID(),
    @Enumerated(EnumType.STRING) var kind: ChangeKind = ChangeKind.CREATE_PERSON,
    @Enumerated(EnumType.STRING) var status: ReviewStatus = ReviewStatus.PENDING,
    var authorId: UUID = UUID.randomUUID(),
    var authorName: String = "",
    var summary: String = "",
    @Column(columnDefinition = "text") var payload: String = "{}",
    @Column(columnDefinition = "text") var previousPayload: String? = null,
    var createdAt: Instant = Instant.now(),
    var reviewedAt: Instant? = null,
    var reviewedBy: UUID? = null,
    @Column(columnDefinition = "text") var reason: String? = null,
)
