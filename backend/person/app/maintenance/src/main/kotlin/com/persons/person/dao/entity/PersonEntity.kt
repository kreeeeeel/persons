package com.persons.person.dao.entity

import com.persons.person.maintenance.AggregateReputation
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "persons")
class PersonEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var tag: String = "",
    var firstName: String = "",
    var lastName: String = "",
    var patronymic: String? = null,
    @Column(columnDefinition = "text") var description: String = "",
    var ownerAccountId: UUID? = null,
    var verified: Boolean = false,
    var avatarMediaId: UUID? = null,
    var published: Boolean = false,
    var deleted: Boolean = false,
    var deletedAt: Instant? = null,
    @Enumerated(EnumType.STRING) var reputationOverride: AggregateReputation? = null,
    var createdAt: Instant = Instant.now(),
    @Version var version: Long? = null,
)
