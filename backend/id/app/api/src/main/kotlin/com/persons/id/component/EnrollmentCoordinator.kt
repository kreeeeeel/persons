package com.persons.id.component

import com.persons.id.domain.IssuedSession
import com.persons.id.service.AccountService
import com.persons.id.service.SessionService
import com.persons.requestobservability.ClientMetadata
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Component
class EnrollmentCoordinator(private val accounts: AccountService, private val sessions: SessionService) {
    @Transactional
    fun complete(id: UUID, grant: String, password: String, avatar: String?, client: ClientMetadata): IssuedSession {
        val account = accounts.register(id, grant, password, avatar)

        return sessions.issue(account, client)
    }
}
