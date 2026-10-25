package com.persons.id.service

import com.persons.id.domain.ChallengeStatus
import com.persons.id.domain.RegistrationDetails
import com.persons.id.domain.VerificationGrant
import java.util.UUID

interface ChallengeService {
    fun begin(details: RegistrationDetails, purpose: String, ip: String, userId: UUID? = null): ChallengeStatus
    fun resend(id: UUID): ChallengeStatus
    fun verify(id: UUID, code: String): VerificationGrant
    fun consume(id: UUID, grant: String, purpose: String, userId: UUID? = null): RegistrationDetails
}
