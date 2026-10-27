package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.component.MyPublicationsComponent
import com.persons.person.contract.api.PublicationsApi
import com.persons.person.contract.dto.MyPublicationPage
import com.persons.person.contract.dto.PublicAuthor
import com.persons.person.contract.dto.PublicationKind
import com.persons.person.service.PublicAuthorService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class PublicationsController(
    private val actors: ActorResolver,
    private val publications: MyPublicationsComponent,
    private val authors: PublicAuthorService,
) : PublicationsApi {
    override fun getPublicAuthor(handle: String): ResponseEntity<PublicAuthor> =
        ResponseEntity.ok(authors.byHandle(handle, actors.optional()))

    override fun getMyPublicAuthor(): ResponseEntity<PublicAuthor> {
        val actor = actors.required()
        return ResponseEntity.ok(authors.byId(actor.id, actor.name))
    }

    override fun listAuthorPublications(
        handle: String,
        kind: PublicationKind?,
        page: Int,
        size: Int,
    ): ResponseEntity<MyPublicationPage> {
        val viewer = actors.optional()
        return ResponseEntity.ok(publications.byAuthor(authors.byHandle(handle, viewer), viewer, kind, page, size))
    }
    override fun listMyPublications(
        kind: PublicationKind?,
        q: String?,
        page: Int,
        size: Int,
    ): ResponseEntity<MyPublicationPage> = ResponseEntity.ok(
        publications.page(actors.required(), kind, q.orEmpty(), page, size),
    )
}
