package com.persons.restrictions.controller

import com.persons.restrictions.component.AccountAccessManagement
import com.persons.restrictions.component.InternalAuthorization
import com.persons.restrictions.component.RestrictionComponent
import com.persons.restrictions.component.RestrictionManagement
import com.persons.restrictions.contract.api.RestrictionsApi
import com.persons.restrictions.contract.dto.AccountRestriction
import com.persons.restrictions.contract.dto.AccountRestrictionPage
import com.persons.restrictions.contract.dto.AdminUser
import com.persons.restrictions.contract.dto.RestrictionExpiryResult
import com.persons.restrictions.contract.dto.RestrictionInput
import com.persons.restrictions.contract.dto.RestrictionLookup
import com.persons.restrictions.contract.dto.RestrictionResult
import com.persons.restrictions.contract.dto.UpdateAccess
import com.persons.restrictions.transformer.toDomain
import com.persons.restrictions.transformer.toDto
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class RestrictionsController(
    private val authorization: InternalAuthorization,
    private val management: RestrictionManagement,
    private val accounts: AccountAccessManagement,
    private val restrictions: RestrictionComponent,
) : RestrictionsApi {
    override fun listActiveRestrictions(
        page: Int,
        size: Int,
        q: String?,
        userId: UUID?,
    ): ResponseEntity<AccountRestrictionPage> {
        authorization.requireService()
        val result = management.page(page, size, q.orEmpty(), userId)
        return ResponseEntity.ok(
            AccountRestrictionPage(
                result.content.stream().map { it.toDto() }.toList(), result.totalElements, page, size,
            ),
        )
    }

    override fun getRestriction(userId: UUID): ResponseEntity<RestrictionResult> {
        authorization.requireService()
        return ResponseEntity.ok(RestrictionResult(restrictions.current(userId)?.toDto()))
    }

    override fun setRestriction(userId: UUID, restrictionInput: RestrictionInput): ResponseEntity<AccountRestriction> {
        authorization.requireService()
        val saved = management.set(userId, restrictionInput.toDomain())
        return ResponseEntity.ok(saved.toDto())
    }

    override fun revokeRestriction(userId: UUID): ResponseEntity<Unit> {
        authorization.requireService()
        management.revoke(userId)
        return ResponseEntity.noContent().build()
    }

    override fun lookupRestrictions(restrictionLookup: RestrictionLookup): ResponseEntity<List<AccountRestriction>> {
        authorization.requireService()
        return ResponseEntity.ok(restrictions.lookup(restrictionLookup.userIds).stream().map { it.toDto() }.toList())
    }

    override fun expireRestrictions(): ResponseEntity<RestrictionExpiryResult> {
        authorization.requireService()
        return ResponseEntity.ok(RestrictionExpiryResult(restrictions.expire()))
    }

    override fun updateUserAccess(userId: UUID, updateAccess: UpdateAccess): ResponseEntity<AdminUser> {
        authorization.requireService()
        return ResponseEntity.ok(accounts.update(userId, updateAccess.toDomain()).toDto())
    }
}
