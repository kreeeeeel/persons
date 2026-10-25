package com.persons.person.dao.entity

import com.persons.person.domain.PageRestrictionScope
import jakarta.persistence.CollectionTable
import jakarta.persistence.Column
import jakarta.persistence.ElementCollection
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.Table
import jakarta.persistence.Version
import org.hibernate.annotations.BatchSize
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "person_user_restrictions")
class PageRestrictionEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var userId: UUID = UUID.randomUUID(),
    var personId: UUID = UUID.randomUUID(),
    @Column(length = 1000) var reason: String = "",
    var createdBy: UUID = UUID.randomUUID(),
    var createdAt: Instant = Instant.now(),
    var expiresAt: Instant? = null,
    var revoked: Boolean = false,
    @ElementCollection
    @CollectionTable(name = "person_user_restriction_scopes", joinColumns = [JoinColumn(name = "restriction_id")])
    @Column(name = "scope", length = 16)
    @Enumerated(EnumType.STRING)
    @BatchSize(size = 50)
    var scopes: MutableSet<PageRestrictionScope> = mutableSetOf(),
    @Version var version: Long = 0,
)
