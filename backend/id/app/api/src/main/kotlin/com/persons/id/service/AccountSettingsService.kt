package com.persons.id.service

import com.persons.id.domain.ChallengeStatus
import com.persons.idcontext.UserPrincipal
import java.util.UUID

interface AccountSettingsService {
    fun changeProfile(user: UserPrincipal, firstName: String, lastName: String, patronymic: String?)
    fun changeAvatar(user: UserPrincipal, avatar: String)
    fun beginEmailChange(
        user: UserPrincipal,
        email: String,
        password: String,
        locale: String,
        ip: String,
    ): ChallengeStatus
    fun completeEmailChange(user: UserPrincipal, challengeId: UUID, grant: String)
    fun changePassword(user: UserPrincipal, currentPassword: String, password: String, ip: String)
}
