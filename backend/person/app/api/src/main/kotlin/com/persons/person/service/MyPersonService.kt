package com.persons.person.service

import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.MyPersonState
import com.persons.person.contract.dto.ProfileInput
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.exception.impl.ConflictException
import com.persons.person.transformer.toSummary
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class MyPersonService(
    private val persons: PersonRepository,
    private val requests: ModerationRepository,
    private val profiles: ProfileService,
) {
    @Transactional(readOnly = true)
    fun state(actor: Actor): MyPersonState {
        val person = persons.byOwner(actor.id) ?: return MyPersonState(false)
        val pending = requests.pendingForTarget(person.id, ChangeKind.CREATE_PERSON)
        return MyPersonState(pending, if (person.published && person.verified) person.toSummary() else null)
    }

    @Transactional
    fun request(input: ProfileInput, actor: Actor): ModerationReceipt {
        if (persons.byOwner(actor.id) != null) throw ConflictException()
        return profiles.create(input, actor.copy(administrator = false))
    }
}
