package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.component.AdminContentComponent
import com.persons.person.contract.api.ContentAdminApi
import com.persons.person.contract.dto.AdminContentKind
import com.persons.person.contract.dto.AdminContentOrder
import com.persons.person.contract.dto.AdminContentPage
import com.persons.person.contract.dto.AdminContentStatus
import com.persons.person.contract.dto.ContentHideInput
import com.persons.person.domain.AdminContentFilter
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.time.OffsetDateTime
import java.util.UUID

@RestController
class ContentAdminController(private val actors: ActorResolver, private val content: AdminContentComponent) :
    ContentAdminApi {
    override fun listAdminContent(
        page: Int,
        size: Int,
        kind: AdminContentKind?,
        status: AdminContentStatus?,
        q: String?,
        authorId: UUID?,
        personId: UUID?,
        createdFrom: OffsetDateTime?,
        createdTo: OffsetDateTime?,
        order: AdminContentOrder?,
    ): ResponseEntity<AdminContentPage> = ResponseEntity.ok(
        content.page(
            AdminContentFilter(
                kind, status, q.orEmpty(), authorId, personId, createdFrom?.toInstant(), createdTo?.toInstant(),
            ),
            page, size, order ?: AdminContentOrder.NEWEST, actors.administrator(),
        ),
    )

    override fun hideAdminContent(
        kind: AdminContentKind,
        id: UUID,
        contentHideInput: ContentHideInput,
    ): ResponseEntity<Unit> {
        content.hide(kind, id, contentHideInput.reason, actors.administrator())
        return ResponseEntity.noContent().build()
    }
}
