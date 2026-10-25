package com.persons.id.service

import com.persons.id.domain.Account
import com.persons.id.domain.IssuedSession
import com.persons.id.domain.SessionInfo
import com.persons.idcontext.UserPrincipal
import com.persons.requestobservability.ClientMetadata
import java.util.UUID

interface SessionService {
    fun issue(account: Account, client: ClientMetadata): IssuedSession
    fun refresh(user: UserPrincipal, token: String, client: ClientMetadata): IssuedSession
    fun list(user: UserPrincipal): List<SessionInfo>
    fun revoke(user: UserPrincipal, id: UUID)
    fun revokeOthers(user: UserPrincipal)
}
