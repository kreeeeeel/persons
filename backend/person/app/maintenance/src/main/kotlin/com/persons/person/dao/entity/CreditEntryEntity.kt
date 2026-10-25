package com.persons.person.dao.entity

import com.persons.person.domain.CreditKind
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "person_credit_entries")
class CreditEntryEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var personId: UUID = UUID.randomUUID(),
    @Enumerated(EnumType.STRING) var kind: CreditKind = CreditKind.TRUST,
    @Column(columnDefinition = "text") var description: String = "",
    var authorId: UUID = UUID.randomUUID(),
    var authorName: String = "",
    var deleted: Boolean = false,
    var createdAt: Instant = Instant.now(),
    var published: Boolean = true,
)
