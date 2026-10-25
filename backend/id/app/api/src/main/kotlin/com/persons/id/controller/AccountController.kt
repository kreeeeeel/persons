package com.persons.id.controller

import com.persons.id.contract.api.AccountApi
import com.persons.id.contract.dto.BeginEmailChange
import com.persons.id.contract.dto.Challenge
import com.persons.id.contract.dto.ChangeAvatar
import com.persons.id.contract.dto.ChangePassword
import com.persons.id.contract.dto.ChangeProfile
import com.persons.id.contract.dto.CompleteEmailChange
import com.persons.id.service.AccountSettingsService
import com.persons.id.transformer.toDto
import com.persons.idcontext.RequireUser
import com.persons.idcontext.UserContext
import com.persons.requestobservability.RequestMetadata
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
@RequireUser
class AccountController(
    private val settings: AccountSettingsService,
    private val context: UserContext,
    private val metadata: RequestMetadata,
    private val request: HttpServletRequest,
) : AccountApi {
    override fun changeProfile(changeProfile: ChangeProfile): ResponseEntity<Unit> {
        settings.changeProfile(
            context.current(), changeProfile.firstName, changeProfile.lastName, changeProfile.patronymic,
        )

        return ResponseEntity.noContent().build()
    }

    override fun changeAvatar(changeAvatar: ChangeAvatar): ResponseEntity<Unit> {
        settings.changeAvatar(context.current(), changeAvatar.avatarBase64)

        return ResponseEntity.noContent().build()
    }

    override fun beginEmailChange(beginEmailChange: BeginEmailChange): ResponseEntity<Challenge> =
        ResponseEntity.accepted().body(
            settings.beginEmailChange(
                context.current(),
                beginEmailChange.email,
                beginEmailChange.currentPassword,
                beginEmailChange.locale.value,
                metadata.client(request).ip,
            ).toDto(),
        )

    override fun completeEmailChange(completeEmailChange: CompleteEmailChange): ResponseEntity<Unit> {
        settings.completeEmailChange(context.current(), completeEmailChange.challengeId, completeEmailChange.grant)

        return ResponseEntity.noContent().build()
    }

    override fun changePassword(changePassword: ChangePassword): ResponseEntity<Unit> {
        settings.changePassword(
            context.current(),
            changePassword.currentPassword,
            changePassword.password,
            metadata.client(request).ip,
        )

        return ResponseEntity.noContent().build()
    }
}
