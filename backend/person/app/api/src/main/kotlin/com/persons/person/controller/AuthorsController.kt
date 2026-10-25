package com.persons.person.controller

import com.persons.person.component.AccountProfiles
import com.persons.person.component.ActorResolver
import com.persons.person.contract.api.AuthorsApi
import com.persons.person.service.AuthorAccessService
import org.springframework.core.io.ByteArrayResource
import org.springframework.core.io.Resource
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class AuthorsController(
    private val actors: ActorResolver,
    private val access: AuthorAccessService,
    private val accounts: AccountProfiles,
) : AuthorsApi {
    override fun getAuthorAvatar(id: UUID): ResponseEntity<Resource> {
        actors.requireService()
        access.requireParticipant(id)
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG)
            .header("Cache-Control", "private, no-store")
            .header("X-Content-Type-Options", "nosniff")
            .body(ByteArrayResource(accounts.avatar(id)))
    }
}
