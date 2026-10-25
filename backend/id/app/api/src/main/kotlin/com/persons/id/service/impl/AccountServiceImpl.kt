package com.persons.id.service.impl

import com.persons.id.component.AvatarProcessor
import com.persons.id.component.AvatarStorage
import com.persons.id.component.PasswordPolicy
import com.persons.id.configuration.properties.IdProperties
import com.persons.id.dao.entity.AccountEntity
import com.persons.id.dao.entity.LoginAttemptEntity
import com.persons.id.dao.repository.AccountRepository
import com.persons.id.dao.repository.LoginAttemptRepository
import com.persons.id.dao.repository.SessionRepository
import com.persons.id.domain.Account
import com.persons.id.domain.AccountStatus
import com.persons.id.domain.RegistrationDetails
import com.persons.id.exception.impl.AvatarNotFoundException
import com.persons.id.exception.impl.EmailInUseException
import com.persons.id.exception.impl.InvalidCredentialsException
import com.persons.id.exception.impl.InvalidInputException
import com.persons.id.exception.impl.OperationFailedException
import com.persons.id.exception.impl.TooManyAttemptsException
import com.persons.id.exception.impl.UnauthorizedException
import com.persons.id.service.AccountService
import com.persons.id.service.ChallengeService
import com.persons.id.transformer.toDomain
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate
import java.time.Clock
import java.util.UUID

private const val MINUS_SECONDS_LIMIT = 900L
private const val AUTHENTICATE_LIMIT = 20
private const val MAX_PASSWORD_BYTES = 72
private const val RESULT_1 = 1
private const val RESULT_60 = 60L
private const val RESULT_0 = 0
private const val EXECUTE_WITHOUT_RESULT = 0
private const val REGISTER = "REGISTER"
private const val RECOVER = "RECOVER"

@Service
class AccountServiceImpl(
    private val accounts: AccountRepository,
    private val attempts: LoginAttemptRepository,
    private val sessions: SessionRepository,
    private val challenges: ChallengeService,
    private val passwords: PasswordEncoder,
    private val policy: PasswordPolicy,
    private val avatars: AvatarProcessor,
    private val storage: AvatarStorage,
    private val transactions: TransactionTemplate,
    private val properties: IdProperties,
    private val clock: Clock,
) : AccountService {
    private val dummyHash = passwords.encode(UUID.randomUUID().toString())

    override fun ensureAvailable(details: RegistrationDetails) {
        if (details.firstName.isBlank() || details.lastName.isBlank()) {
            throw InvalidInputException()
        }
        if (accounts.findByEmail(details.email) != null) {
            throw EmailInUseException()
        }
    }

    override fun register(id: UUID, grant: String, password: String, avatar: String?): Account {
        policy.validate(password)

        val encoded = passwords.encode(password)
        val picture = avatars.decode(avatar)
        val account = transactions.execute {
            val details = challenges.consume(id, grant, REGISTER)

            ensureAvailable(details)
            accounts.save(
                AccountEntity(
                    email = details.email,
                    firstName = details.firstName,
                    lastName = details.lastName,
                    patronymic = details.patronymic,
                    locale = details.locale,
                    passwordHash = encoded,
                    avatar = picture,
                ),
            ).toDomain()
        }

        if (account == null) {
            throw OperationFailedException()
        }

        return account
    }

    override fun authenticate(email: String, password: String, ip: String): Account {
        if (attempts.countRecentByIp(ip, clock.instant().minusSeconds(MINUS_SECONDS_LIMIT)) >=
            AUTHENTICATE_LIMIT
        ) {
            throw TooManyAttemptsException()
        }

        val result = transactions.execute {
            attempts.save(LoginAttemptEntity(ip = ip, createdAt = clock.instant()))

            val account = accounts.findLockedByEmail(email.trim().lowercase())
            val validPassword = password.toByteArray().size <= MAX_PASSWORD_BYTES &&
                passwords.matches(password, account?.passwordHash ?: dummyHash)

            if (account == null) {
                null
            } else if (account.status != AccountStatus.ACTIVE) {
                null
            } else if (account.lockedUntil?.isAfter(clock.instant()) == true) {
                null
            } else if (!validPassword) {
                account.failedLogins += RESULT_1

                if (account.failedLogins >= properties.maxLoginAttempts) {
                    account.lockedUntil = clock.instant().plusSeconds(properties.lockMinutes * RESULT_60)
                    account.failedLogins = RESULT_0
                }

                accounts.save(account)
                null
            } else {
                account.failedLogins = RESULT_0
                account.lockedUntil = null
                accounts.save(account).toDomain()
            }
        }

        if (result == null) {
            throw InvalidCredentialsException()
        }

        return result
    }

    override fun recover(id: UUID, grant: String, password: String) {
        policy.validate(password)

        val encoded = passwords.encode(password)

        transactions.executeWithoutResult {
            val details = challenges.consume(id, grant, RECOVER)
            val account = accounts.findLockedByEmail(details.email)

            if (account != null) {
                account.passwordHash = encoded
                account.failedLogins = EXECUTE_WITHOUT_RESULT
                account.lockedUntil = null
                accounts.save(account)
                sessions.findActiveByUser(account.id, clock.instant()).stream().forEach { session ->
                    session.revoked = true
                    sessions.save(session)
                }
            }
        }
    }

    override fun get(id: UUID): Account = entity(id).toDomain()

    override fun avatar(id: UUID): ByteArray {
        val account = entity(id)
        val key = account.avatarObjectKey

        if (key != null) {
            return storage.get(key)
        }

        val avatar = account.avatar

        if (avatar == null) {
            throw AvatarNotFoundException()
        }

        return avatar
    }

    private fun entity(id: UUID): AccountEntity {
        val account = accounts.findById(id).orElse(null)

        if (account == null) {
            throw UnauthorizedException()
        }

        return account
    }
}
