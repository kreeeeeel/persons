package com.persons.gateway.controller

import com.persons.gateway.component.ActorResolver
import com.persons.gateway.component.RestrictionsGateway
import com.persons.person.contract.api.RestrictionsApi
import com.persons.person.contract.dto.AccountRestriction
import com.persons.person.contract.dto.AccountRestrictionPage
import com.persons.person.contract.dto.RestrictionInput
import com.persons.person.contract.dto.RestrictionState
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/person")
class RestrictionsController(private val actors: ActorResolver, private val restrictions: RestrictionsGateway) :
    RestrictionsApi {
    override fun listBlockedUsers(
        page: Int,
        size: Int,
        q: String?,
        userId: UUID?,
    ): ResponseEntity<AccountRestrictionPage> = ResponseEntity.ok(restrictions.page(page, size, q, userId))

    override fun getAccessState(): ResponseEntity<RestrictionState> {
        val actor = actors.optional()
        return ResponseEntity.ok(RestrictionState(actor != null, actor?.let { restrictions.current(it.id) }))
    }

    override fun getUserRestriction(id: UUID): ResponseEntity<RestrictionState> {
        actors.administrator()
        return ResponseEntity.ok(RestrictionState(true, restrictions.current(id)))
    }

    override fun setUserRestriction(id: UUID, restrictionInput: RestrictionInput): ResponseEntity<AccountRestriction> =
        ResponseEntity.ok(restrictions.set(id, restrictionInput))

    override fun revokeUserRestriction(id: UUID): ResponseEntity<Unit> {
        restrictions.revoke(id)
        return ResponseEntity.noContent().build()
    }
}
