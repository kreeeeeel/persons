package com.persons.id.component

import com.persons.id.contract.dto.AdminUser
import com.persons.id.contract.dto.AdminUsers
import com.persons.id.contract.dto.ChangeProfile
import com.persons.id.contract.dto.Sessions
import com.persons.id.contract.dto.UpdateAccess
import com.persons.id.domain.AccountRole
import com.persons.id.domain.AccountStatus
import com.persons.id.service.AdminService
import com.persons.id.transformer.toDto
import com.persons.idcontext.UserContext
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class AdminOperations(private val admin: AdminService, private val context: UserContext) {
    fun list(page: Int, size: Int, search: String?): ResponseEntity<AdminUsers> {
        val result = admin.list(context.current().userId, page, size, search)

        return ResponseEntity.ok(
            AdminUsers(result.content.stream().map { it.toDto() }.toList(), result.totalElements, page, size),
        )
    }

    fun update(id: UUID, access: UpdateAccess): ResponseEntity<AdminUser> = ResponseEntity.ok(
        admin.update(
            context.current().userId,
            id,
            AccountRole.valueOf(access.role.value),
            AccountStatus.valueOf(access.status.value),
        ).toDto(),
    )

    fun profile(id: UUID, profile: ChangeProfile): ResponseEntity<AdminUser> = ResponseEntity.ok(
        admin.updateProfile(
            context.current().userId, id, profile.firstName, profile.lastName, profile.patronymic,
        ).toDto(),
    )

    fun sessions(id: UUID): ResponseEntity<Sessions> = ResponseEntity.ok()
        .header("Cache-Control", "private, no-store")
        .body(Sessions(admin.sessions(context.current().userId, id).stream().map { it.toDto() }.toList()))

    fun revoke(id: UUID): ResponseEntity<Unit> {
        admin.revoke(context.current().userId, id)

        return ResponseEntity.noContent().build()
    }
}
