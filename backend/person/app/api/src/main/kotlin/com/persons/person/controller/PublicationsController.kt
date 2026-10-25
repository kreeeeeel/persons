package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.component.MyPublicationsComponent
import com.persons.person.contract.api.PublicationsApi
import com.persons.person.contract.dto.MyPublicationPage
import com.persons.person.contract.dto.PublicationKind
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class PublicationsController(private val actors: ActorResolver, private val publications: MyPublicationsComponent) :
    PublicationsApi {
    override fun listMyPublications(
        kind: PublicationKind?,
        q: String?,
        page: Int,
        size: Int,
    ): ResponseEntity<MyPublicationPage> = ResponseEntity.ok(
        publications.page(actors.required(), kind, q.orEmpty(), page, size),
    )
}
