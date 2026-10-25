package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.contract.api.PublicationApi
import com.persons.person.contract.dto.PublicationSettings
import com.persons.person.contract.dto.UserModerationSettings
import com.persons.person.service.PublicationPolicyService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class PublicationController(private val actors: ActorResolver, private val policy: PublicationPolicyService) :
    PublicationApi {
    override fun getPublicationSettings(): ResponseEntity<PublicationSettings> {
        actors.administrator()
        return ResponseEntity.ok(policy.current())
    }

    override fun updatePublicationSettings(
        publicationSettings: PublicationSettings,
    ): ResponseEntity<PublicationSettings> =
        ResponseEntity.ok(policy.update(publicationSettings, actors.administrator()))

    override fun getUserModerationSettings(id: UUID): ResponseEntity<UserModerationSettings> {
        actors.administrator()
        return ResponseEntity.ok(policy.user(id))
    }

    override fun updateUserModerationSettings(
        id: UUID,
        userModerationSettings: UserModerationSettings,
    ): ResponseEntity<UserModerationSettings> = ResponseEntity.ok(
        policy.updateUser(id, userModerationSettings, actors.administrator()),
    )
}
