package com.persons.person.dao.entity

import com.persons.person.domain.NotificationKind
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "person_notifications")
class NotificationEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var userId: UUID = UUID.randomUUID(),
    var personTag: String = "",
    @Enumerated(EnumType.STRING) var kind: NotificationKind = NotificationKind.APPROVED,
    var subject: String = "",
    @Column(columnDefinition = "text") var reason: String? = null,
    var createdAt: Instant = Instant.now(),
    var readAt: Instant? = null,
)
