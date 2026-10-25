package com.persons.id.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

private const val INITIAL_ATTEMPTS = 0
private const val DEFAULT_SENDS = 1
private const val REGISTER = "REGISTER"

@Entity
@Table(name = "challenges")
class ChallengeEntity(
    @Id
    var id: UUID = UUID.randomUUID(),
    var email: String = "",
    var firstName: String = "",
    var lastName: String = "",
    var patronymic: String? = null,
    var locale: String = "ru",
    var purpose: String = REGISTER,
    var userId: UUID? = null,
    var codeHash: String = "",
    var proofHash: String? = null,
    var attempts: Int = INITIAL_ATTEMPTS,
    var sends: Int = DEFAULT_SENDS,
    var ip: String = "",
    var createdAt: Instant = Instant.now(),
    var expiresAt: Instant = Instant.now(),
    var resendAt: Instant = Instant.now(),
    var consumed: Boolean = false,
    @Version
    var version: Long? = null,
)
