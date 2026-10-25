package com.persons.id.service

import com.persons.id.domain.Account
import com.persons.id.domain.RegistrationDetails
import java.util.UUID

interface AccountService {
    fun ensureAvailable(details: RegistrationDetails)
    fun register(id: UUID, grant: String, password: String, avatar: String?): Account
    fun authenticate(email: String, password: String, ip: String): Account
    fun recover(id: UUID, grant: String, password: String)
    fun get(id: UUID): Account
    fun avatar(id: UUID): ByteArray
}
