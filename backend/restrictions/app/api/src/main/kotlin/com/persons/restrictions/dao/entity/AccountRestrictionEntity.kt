package com.persons.restrictions.dao.entity

import com.persons.restrictions.domain.RestrictionScope
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
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "account_restrictions")
class AccountRestrictionEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var userId: UUID = UUID.randomUUID(),
    var reason: String = "",
    var createdBy: UUID = UUID.randomUUID(),
    var createdAt: Instant = Instant.EPOCH,
    var expiresAt: Instant? = null,
    var revoked: Boolean = false,
    @Version var revision: Long = 0,
    @org.hibernate.annotations.BatchSize(size = 100)
    @ElementCollection
    @CollectionTable(name = "account_restriction_scopes", joinColumns = [JoinColumn(name = "restriction_id")])
    @Column(name = "scope")
    @Enumerated(EnumType.STRING)
    var scopes: MutableSet<RestrictionScope> = mutableSetOf(),
)
