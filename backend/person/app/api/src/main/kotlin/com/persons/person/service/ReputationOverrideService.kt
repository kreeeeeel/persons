package com.persons.person.service

import com.persons.person.contract.dto.PersonProfile
import com.persons.person.contract.dto.ReputationOverrideInput
import com.persons.person.domain.Actor
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.maintenance.AggregateReputation
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class ReputationOverrideService(private val access: PersonAccessService, private val queries: PersonQueryService) {
    @Transactional
    fun update(id: UUID, input: ReputationOverrideInput, actor: Actor): PersonProfile {
        if (!actor.administrator) {
            throw ForbiddenException()
        }
        val person = access.locked(id)
        person.reputationOverride = input.reputation?.let { AggregateReputation.valueOf(it.name) }
        return queries.profile(person.tag, actor)
    }
}
