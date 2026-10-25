package com.persons.id.controller

import com.persons.id.contract.api.InternalApi
import com.persons.id.contract.dto.Principal
import com.persons.id.service.AccountService
import com.persons.idcontext.RequireUser
import com.persons.idcontext.UserContext
import org.springframework.core.io.ByteArrayResource
import org.springframework.core.io.Resource
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.time.ZoneOffset
import java.util.UUID

@RestController
class IntrospectionController(
    private val context: UserContext,
    private val accounts: AccountService,
    private val admin: com.persons.id.component.AdminOperations,
    private val profiles: com.persons.id.service.UserProfileService,
) : InternalApi {
    @RequireUser
    override fun listAdminUsers(
        page: Int,
        size: Int,
        search: String?,
    ): ResponseEntity<com.persons.id.contract.dto.AdminUsers> = admin.list(page, size, search)

    @RequireUser
    override fun updateUserAccess(
        id: UUID,
        updateAccess: com.persons.id.contract.dto.UpdateAccess,
    ): ResponseEntity<com.persons.id.contract.dto.AdminUser> = admin.update(id, updateAccess)

    @RequireUser
    override fun updateUserProfile(
        id: UUID,
        changeProfile: com.persons.id.contract.dto.ChangeProfile,
    ): ResponseEntity<com.persons.id.contract.dto.AdminUser> = admin.profile(id, changeProfile)

    @RequireUser
    override fun listUserSessions(id: UUID): ResponseEntity<com.persons.id.contract.dto.Sessions> = admin.sessions(id)

    @RequireUser
    override fun revokeUserSessions(id: UUID): ResponseEntity<Unit> = admin.revoke(id)

    override fun getUserAvatar(userId: UUID): ResponseEntity<Resource> = ResponseEntity.ok()
        .contentType(MediaType.IMAGE_JPEG)
        .header("Cache-Control", "private, no-store")
        .body(ByteArrayResource(accounts.avatar(userId)))

    override fun getUserProfiles(
        javaUtilUUID: List<UUID>,
    ): ResponseEntity<List<com.persons.id.contract.dto.UserProfile>> =
        ResponseEntity.ok().header("Cache-Control", "private, no-store").body(profiles.profiles(javaUtilUUID))

    @RequireUser
    override fun introspectSession(): ResponseEntity<Principal> {
        val user = context.current()

        return ResponseEntity.ok(
            Principal(
                user.userId,
                user.sessionId,
                user.email,
                user.locale,
                user.expiresAt.atOffset(ZoneOffset.UTC),
                com.persons.id.contract.dto.AccountRole.valueOf(accounts.get(user.userId).role.name),
            ),
        )
    }
}
