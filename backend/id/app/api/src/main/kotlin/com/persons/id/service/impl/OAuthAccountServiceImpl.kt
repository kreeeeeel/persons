package com.persons.id.service.impl

import com.persons.id.dao.entity.AccountEntity
import com.persons.id.dao.entity.OAuthIdentityEntity
import com.persons.id.dao.repository.AccountRepository
import com.persons.id.dao.repository.OAuthIdentityRepository
import com.persons.id.domain.Account
import com.persons.id.domain.AccountStatus
import com.persons.id.exception.impl.ForbiddenException
import com.persons.id.exception.impl.OAuthAccountConflictException
import com.persons.id.exception.impl.UserNotFoundException
import com.persons.id.oauth.OAuthIdentity
import com.persons.id.service.OAuthAccountService
import com.persons.id.transformer.toDomain
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class OAuthAccountServiceImpl(
    private val identities: OAuthIdentityRepository,
    private val accounts: AccountRepository,
) : OAuthAccountService {
    @Transactional
    override fun resolve(provider: String, identity: OAuthIdentity, locale: String): Account {
        val linked = identities.findByProviderAndSubject(provider, identity.subject)

        if (linked != null) {
            val account = accounts.findById(linked.userId).orElse(null)

            if (account == null) {
                throw UserNotFoundException()
            }
            if (account.status != AccountStatus.ACTIVE) {
                throw ForbiddenException()
            }

            return account.toDomain()
        }
        if (accounts.findByEmail(identity.email) != null) {
            throw OAuthAccountConflictException()
        }

        val account = accounts.save(
            AccountEntity(
                email = identity.email,
                firstName = identity.firstName,
                lastName = identity.lastName,
                locale = locale,
            ),
        )

        identities.save(OAuthIdentityEntity(provider = provider, subject = identity.subject, userId = account.id))

        return account.toDomain()
    }
}
