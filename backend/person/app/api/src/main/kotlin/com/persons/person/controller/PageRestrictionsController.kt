package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.contract.api.PageRestrictionsApi
import com.persons.person.contract.dto.PageRestriction
import com.persons.person.contract.dto.PageRestrictionInput
import com.persons.person.contract.dto.PageRestrictionList
import com.persons.person.contract.dto.PageRestrictionPage
import com.persons.person.service.PageRestrictionService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class PageRestrictionsController(private val actors: ActorResolver, private val restrictions: PageRestrictionService) :
    PageRestrictionsApi {
    override fun listActivePageRestrictions(
        page: Int,
        size: Int,
        q: String?,
        userId: UUID?,
    ): ResponseEntity<PageRestrictionPage> =
        ResponseEntity.ok(restrictions.page(page, size, q.orEmpty(), userId, actors.administrator()))

    override fun listPageRestrictions(id: UUID): ResponseEntity<PageRestrictionList> =
        ResponseEntity.ok(restrictions.list(id, actors.administrator()))

    override fun setPageRestriction(
        id: UUID,
        pageRestrictionInput: PageRestrictionInput,
    ): ResponseEntity<PageRestriction> =
        ResponseEntity.ok(restrictions.set(id, pageRestrictionInput, actors.administrator()))

    override fun revokePageRestriction(id: UUID, restrictionId: UUID): ResponseEntity<Unit> {
        restrictions.revoke(id, restrictionId, actors.administrator())
        return ResponseEntity.noContent().build()
    }
}
