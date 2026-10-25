package com.persons.id.dao.entity

import com.persons.id.domain.AccountRole
import com.persons.id.domain.AccountStatus
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

private const val DEFAULT_FAILED_LOGINS = 0

@Entity
@Table(name = "accounts")
class AccountEntity(
    @Id
    var id: UUID = UUID.randomUUID(),
    var email: String = "",
    var firstName: String = "",
    var lastName: String = "",
    var patronymic: String? = null,
    var locale: String = "ru",
    @Enumerated(EnumType.STRING)
    var role: AccountRole = AccountRole.USER,
    @Enumerated(EnumType.STRING)
    var status: AccountStatus = AccountStatus.ACTIVE,
    var passwordHash: String = "",
    @Column(columnDefinition = "bytea")
    var avatar: ByteArray? = null,
    var avatarObjectKey: String? = null,
    var avatarNextAttemptAt: Instant? = null,
    var failedLogins: Int = DEFAULT_FAILED_LOGINS,
    var lockedUntil: Instant? = null,
    var createdAt: Instant = Instant.now(),
    @Version
    var version: Long? = null,
)
