package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.contract.api.ReputationAdminApi
import com.persons.person.contract.dto.PersonProfile
import com.persons.person.contract.dto.ReputationOverrideInput
import com.persons.person.service.ReputationOverrideService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class ReputationAdminController(private val actors: ActorResolver, private val reputation: ReputationOverrideService) :
    ReputationAdminApi {
    override fun setReputationOverride(
        id: UUID,
        reputationOverrideInput: ReputationOverrideInput,
    ): ResponseEntity<PersonProfile> =
        ResponseEntity.ok(reputation.update(id, reputationOverrideInput, actors.required()))
}
