package com.persons.gateway.controller

import com.persons.gateway.component.AdminAccountGateway
import com.persons.gateway.component.RestrictionsGateway
import com.persons.gateway.exception.impl.UnavailableException
import com.persons.gateway.transformer.toClient
import com.persons.gateway.transformer.toDto
import com.persons.person.contract.api.AccountsApi
import com.persons.person.contract.dto.AccountStatus
import com.persons.person.contract.dto.AdminSessions
import com.persons.person.contract.dto.AdminUser
import com.persons.person.contract.dto.AdminUsers
import com.persons.person.contract.dto.RestrictionScope
import com.persons.person.contract.dto.UpdateAccess
import com.persons.person.contract.dto.UserProfileUpdate
import org.springframework.core.io.ByteArrayResource
import org.springframework.core.io.Resource
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Duration
import java.util.UUID

private val UPSTREAM_TIMEOUT = Duration.ofSeconds(20)

@RestController
@RequestMapping("/person")
class AdminAccountController(private val gateway: AdminAccountGateway, private val restrictions: RestrictionsGateway) :
    AccountsApi {
    override fun getAdminUserAvatar(id: UUID): ResponseEntity<Resource> {
        val avatar = gateway.avatar(id).block(UPSTREAM_TIMEOUT) ?: throw UnavailableException()

        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG)
            .header("Cache-Control", "private, no-store")
            .header("X-Content-Type-Options", "nosniff")
            .body(ByteArrayResource(avatar))
    }

    override fun listAdminUsers(page: Int, size: Int, search: String?): ResponseEntity<AdminUsers> {
        val result = gateway.api().listAdminUsers(page, size, search).block(UPSTREAM_TIMEOUT)
        if (result == null) throw UnavailableException()
        val users = result.toDto()
        val active = restrictions.lookup(users.items.stream().map { it.id }.toList())
        return ResponseEntity.ok(
            users.copy(
                items = users.items.stream().map {
                    it.copy(
                        restriction = active[it.id],
                        status = if (active[it.id]?.scopes?.contains(
                                RestrictionScope.ACCOUNT,
                            ) == true
                        ) {
                            AccountStatus.BLOCKED
                        } else {
                            it.status
                        },
                    )
                }.toList(),
            ),
        )
    }

    override fun updateUserAccess(id: UUID, updateAccess: UpdateAccess): ResponseEntity<AdminUser> =
        ResponseEntity.ok(restrictions.updateAccess(id, updateAccess))

    override fun updateUserProfile(id: UUID, userProfileUpdate: UserProfileUpdate): ResponseEntity<AdminUser> {
        val result = gateway.api().updateUserProfile(id, userProfileUpdate.toClient()).block(UPSTREAM_TIMEOUT)
        if (result == null) {
            throw UnavailableException()
        }
        return ResponseEntity.ok().header("Cache-Control", "private, no-store").body(result.toDto())
    }

    override fun listUserSessions(id: UUID): ResponseEntity<AdminSessions> {
        val result = gateway.api().listUserSessions(id).block(UPSTREAM_TIMEOUT)
        if (result == null) {
            throw UnavailableException()
        }
        return ResponseEntity.ok()
            .header("Cache-Control", "private, no-store")
            .body(AdminSessions(result.items.stream().map { it.toDto() }.toList()))
    }

    override fun revokeUserSessions(id: UUID): ResponseEntity<Unit> {
        gateway.api().revokeUserSessions(id).block(UPSTREAM_TIMEOUT)
        return ResponseEntity.noContent().build()
    }
}
