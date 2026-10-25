package com.persons.id.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "oauth_flows")
class OAuthFlowEntity(
    @Id var stateHash: String = "",
    var bindingHash: String = "",
    var provider: String = "",
    var verifier: String = "",
    var locale: String = "ru",
    var expiresAt: Instant = Instant.EPOCH,
    var consumed: Boolean = false,
)
