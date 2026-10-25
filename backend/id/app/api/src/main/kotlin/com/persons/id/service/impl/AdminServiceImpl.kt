package com.persons.id.service.impl

import com.persons.id.dao.repository.AccountRepository
import com.persons.id.dao.repository.SessionRepository
import com.persons.id.dao.specification.accountSearch
import com.persons.id.domain.AccountRole
import com.persons.id.domain.AccountStatus
import com.persons.id.domain.AdminAccount
import com.persons.id.domain.SessionInfo
import com.persons.id.exception.impl.ForbiddenException
import com.persons.id.exception.impl.InvalidInputException
import com.persons.id.exception.impl.LastAdministratorException
import com.persons.id.exception.impl.UserNotFoundException
import com.persons.id.service.AdminService
import com.persons.id.transformer.toAdminDomain
import com.persons.id.transformer.toSessionInfo
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.util.UUID

private const val MAX_PAGE_SIZE = 100
private const val MAX_SEARCH_LENGTH = 254
private const val MAX_NAME_LENGTH = 80
private const val LAST_ADMIN_COUNT = 1L

@Service
class AdminServiceImpl(
    private val accounts: AccountRepository,
    private val sessions: SessionRepository,
    private val clock: Clock,
) : AdminService {
    override fun list(actor: UUID, page: Int, size: Int, search: String?): Page<AdminAccount> {
        authorize(actor)

        if (page < 0 || size !in 1..MAX_PAGE_SIZE || search.orEmpty().length > MAX_SEARCH_LENGTH) {
            throw InvalidInputException()
        }

        return accounts.findAll(
            accountSearch(search),
            PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"))),
        ).map { it.toAdminDomain() }
    }

    @Transactional
    override fun update(actor: UUID, target: UUID, role: AccountRole, status: AccountStatus): AdminAccount {
        accounts.lockAdministrators()
        authorize(actor)

        val account = accounts.findLockedById(target)

        if (account == null) {
            throw UserNotFoundException()
        }
        if (account.role == AccountRole.ADMIN &&
            account.status == AccountStatus.ACTIVE &&
            (role != AccountRole.ADMIN || status != AccountStatus.ACTIVE) &&
            accounts.activeAdministrators() <= LAST_ADMIN_COUNT
        ) {
            throw LastAdministratorException()
        }

        val changed = account.role != role || account.status != status

        account.role = role
        account.status = status
        val saved = accounts.save(account)

        if (changed) {
            revokeActive(target)
        }

        return saved.toAdminDomain()
    }

    @Transactional
    override fun updateProfile(
        actor: UUID,
        target: UUID,
        firstName: String,
        lastName: String,
        patronymic: String?,
    ): AdminAccount {
        authorize(actor)

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

        val account = accounts.findLockedById(target) ?: throw UserNotFoundException()

        account.firstName = givenName
        account.lastName = familyName
        account.patronymic = middleName

        return accounts.save(account).toAdminDomain()
    }

    override fun sessions(actor: UUID, target: UUID): List<SessionInfo> {
        authorize(actor)

        if (!accounts.existsById(target)) {
            throw UserNotFoundException()
        }

        return sessions.findActiveByUser(target, clock.instant()).stream().map { it.toSessionInfo() }.toList()
    }

    @Transactional
    override fun revoke(actor: UUID, target: UUID) {
        authorize(actor)

        if (!accounts.existsById(target)) {
            throw UserNotFoundException()
        }

        revokeActive(target)
    }

    @Transactional
    override fun bootstrap(email: String) {
        accounts.lockAdministrators()

        if (accounts.activeAdministrators() > 0) {
            return
        }

        val account = accounts.findLockedByEmail(email.trim().lowercase())

        if (account != null && account.status == AccountStatus.ACTIVE) {
            account.role = AccountRole.ADMIN
            accounts.save(account)
        }
    }

    private fun authorize(actor: UUID) {
        val account = accounts.findById(actor).orElse(null)

        if (account == null || account.role != AccountRole.ADMIN || account.status != AccountStatus.ACTIVE) {
            throw ForbiddenException()
        }
    }

    private fun revokeActive(userId: UUID) {
        sessions.findActiveByUser(userId, clock.instant()).stream().forEach {
            it.revoked = true
            sessions.save(it)
        }
    }
}
