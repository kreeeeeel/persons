package com.persons.person.service

import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.MediaStatus
import com.persons.person.domain.OwnershipClaim
import com.persons.person.exception.impl.ConflictException
import com.persons.person.exception.impl.InvalidInputException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

private const val CLAIM_SUMMARY = "Подтверждение владельца страницы"
private const val MIN_PROOF_TEXT = 10
private const val MAX_PROOF_TEXT = 2000

@Service
class OwnershipService(
    private val persons: PersonRepository,
    private val access: PersonAccessService,
    private val requests: ModerationRepository,
    private val queue: ModerationQueueService,
    private val media: MediaService,
) {
    fun validate(personId: UUID, actor: Actor, message: String) {
        if (message.trim().length !in MIN_PROOF_TEXT..MAX_PROOF_TEXT) throw InvalidInputException()
        eligible(access.visible(personId, actor), actor.id)
        if (requests.pendingClaim(personId, actor.id)) throw ConflictException()
    }

    @Transactional
    fun submit(personId: UUID, actor: Actor, message: String, proofId: UUID): ModerationReceipt {
        val person = access.locked(personId)
        validate(personId, actor, message)
        media.pendingProof(proofId, actor.id, personId)
        return queue.submit(
            person, proofId, ChangeKind.CLAIM_OWNERSHIP, actor, CLAIM_SUMMARY,
            OwnershipClaim(actor.id, message.trim(), proofId),
        )
    }

    fun approve(person: PersonEntity, claim: OwnershipClaim) {
        eligible(person, claim.accountId)
        val proof = media.proof(claim.mediaId, claim.accountId, person.id)
        proof.status = MediaStatus.PUBLISHED
        person.ownerAccountId = claim.accountId
        person.verified = true
    }

    fun link(person: PersonEntity, accountId: UUID?) {
        if (accountId != null) {
            val existing = persons.byOwner(accountId)
            if (existing != null && existing.id != person.id) throw ConflictException()
        }
        person.ownerAccountId = accountId
        person.verified = accountId != null
    }

    private fun eligible(person: PersonEntity, accountId: UUID) {
        if (person.ownerAccountId != null || persons.byOwner(accountId) != null) throw ConflictException()
    }
}
