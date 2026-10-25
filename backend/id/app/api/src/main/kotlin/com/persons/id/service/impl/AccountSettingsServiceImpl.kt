package com.persons.id.service.impl

import com.persons.id.component.AvatarProcessor
import com.persons.id.component.PasswordPolicy
import com.persons.id.dao.repository.AccountRepository
import com.persons.id.domain.ChallengeStatus
import com.persons.id.domain.RegistrationDetails
import com.persons.id.exception.impl.EmailInUseException
import com.persons.id.exception.impl.InvalidCredentialsException
import com.persons.id.exception.impl.InvalidInputException
import com.persons.id.exception.impl.UnauthorizedException
import com.persons.id.service.AccountService
import com.persons.id.service.AccountSettingsService
import com.persons.id.service.ChallengeService
import com.persons.id.service.SessionService
import com.persons.idcontext.UserPrincipal
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate
import java.util.UUID

private const val EMAIL_CHANGE = "CHANGE_EMAIL"
private const val MAX_NAME_LENGTH = 80

@Service
class AccountSettingsServiceImpl(
    private val repository: AccountRepository,
    private val accounts: AccountService,
    private val challenges: ChallengeService,
    private val sessions: SessionService,
    private val passwords: PasswordEncoder,
    private val policy: PasswordPolicy,
    private val transactions: TransactionTemplate,
    private val avatars: AvatarProcessor,
) : AccountSettingsService {
    @Transactional
    override fun changeProfile(user: UserPrincipal, firstName: String, lastName: String, patronymic: String?) {
        val givenName = firstName.trim()
        val familyName = lastName.trim()
        val middleName = patronymic?.trim()?.takeIf { it.isNotEmpty() }

        if (givenName.isEmpty() ||
            familyName.isEmpty() ||
            givenName.length > MAX_NAME_LENGTH ||
            familyName.length > MAX_NAME_LENGTH ||
            (middleName?.length ?: 0) > MAX_NAME_LENGTH
        ) {
            throw InvalidInputException()
        }

        val account = repository.findLockedById(user.userId) ?: throw UnauthorizedException()

        account.firstName = givenName
        account.lastName = familyName
        account.patronymic = middleName
        repository.save(account)
    }

    override fun changeAvatar(user: UserPrincipal, avatar: String) {
        val picture = avatars.decode(avatar)

        transactions.executeWithoutResult {
            val account = repository.findLockedById(user.userId)

            if (account == null) {
                throw UnauthorizedException()
            }

            account.avatar = picture
            account.avatarObjectKey = null
            account.avatarNextAttemptAt = null
            repository.save(account)
        }
    }

    override fun beginEmailChange(
        user: UserPrincipal,
        email: String,
        password: String,
        locale: String,
        ip: String,
    ): ChallengeStatus {
        val account = accounts.get(user.userId)

        accounts.authenticate(account.email, password, ip)

        val normalizedEmail = email.trim().lowercase()

        if (account.email == normalizedEmail) {
            throw InvalidInputException()
        }
        if (repository.findByEmail(normalizedEmail) != null) {
            throw EmailInUseException()
        }

        return challenges.begin(
            RegistrationDetails(account.firstName, account.lastName, account.patronymic, normalizedEmail, locale),
            EMAIL_CHANGE,
            ip,
            user.userId,
        )
    }

    @Transactional
    override fun completeEmailChange(user: UserPrincipal, challengeId: UUID, grant: String) {
        val account = repository.findLockedById(user.userId)

        if (account == null) {
            throw UnauthorizedException()
        }

        val details = challenges.consume(challengeId, grant, EMAIL_CHANGE, user.userId)

        if (repository.findByEmail(details.email) != null) {
            throw EmailInUseException()
        }

        account.email = details.email
        repository.save(account)
        sessions.revokeOthers(user)
    }

    override fun changePassword(user: UserPrincipal, currentPassword: String, password: String, ip: String) {
        policy.validate(password)

        val identity = accounts.get(user.userId)

        accounts.authenticate(identity.email, currentPassword, ip)

        val encoded = passwords.encode(password)

        transactions.executeWithoutResult {
            val account = repository.findLockedById(user.userId)

            if (account == null) {
                throw UnauthorizedException()
            }
            if (!passwords.matches(currentPassword, account.passwordHash)) {
                throw InvalidCredentialsException()
            }

            account.passwordHash = encoded
            repository.save(account)
            sessions.revokeOthers(user)
        }
    }
}
