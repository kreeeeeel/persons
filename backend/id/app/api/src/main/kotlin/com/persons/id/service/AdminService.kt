package com.persons.id.service

import com.persons.id.domain.AccountRole
import com.persons.id.domain.AccountStatus
import com.persons.id.domain.AdminAccount
import com.persons.id.domain.SessionInfo
import org.springframework.data.domain.Page
import java.util.UUID

interface AdminService {
    fun list(actor: UUID, page: Int, size: Int, search: String?): Page<AdminAccount>
    fun update(actor: UUID, target: UUID, role: AccountRole, status: AccountStatus): AdminAccount
    fun updateProfile(actor: UUID, target: UUID, firstName: String, lastName: String, patronymic: String?): AdminAccount
    fun sessions(actor: UUID, target: UUID): List<SessionInfo>
    fun revoke(actor: UUID, target: UUID)
    fun bootstrap(email: String)
}
