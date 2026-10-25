package com.persons.id.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "oauth_identities")
class OAuthIdentityEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var provider: String = "",
    var subject: String = "",
    var userId: UUID = UUID.randomUUID(),
)
