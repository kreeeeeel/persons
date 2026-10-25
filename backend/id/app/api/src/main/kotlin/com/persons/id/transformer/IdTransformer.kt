package com.persons.id.transformer

import com.persons.id.contract.dto.Challenge
import com.persons.id.contract.dto.Register
import com.persons.id.contract.dto.Session
import com.persons.id.contract.dto.SessionToken
import com.persons.id.contract.dto.Verification
import com.persons.id.domain.ChallengeStatus
import com.persons.id.domain.IssuedSession
import com.persons.id.domain.RegistrationDetails
import com.persons.id.domain.SessionInfo
import com.persons.id.domain.VerificationGrant
import java.time.ZoneOffset

fun Register.toDomain(): RegistrationDetails = RegistrationDetails(
    firstName.trim(),
    lastName.trim(),
    patronymic?.trim()?.ifBlank {
        null
    },
    email.trim().lowercase(),
    locale.value,
)

fun ChallengeStatus.toDto(): Challenge =
    Challenge(id, expiresAt.atOffset(ZoneOffset.UTC), resendAt.atOffset(ZoneOffset.UTC))

fun VerificationGrant.toDto(): Verification = Verification(grant, expiresAt.atOffset(ZoneOffset.UTC))

fun IssuedSession.toDto(): SessionToken = SessionToken(token, expiresAt.atOffset(ZoneOffset.UTC), user.toDto())

fun SessionInfo.toDto(): Session = Session(
    id = id,
    createdAt = createdAt.atOffset(ZoneOffset.UTC),
    lastSeenAt = lastSeenAt.atOffset(ZoneOffset.UTC),
    expiresAt = expiresAt.atOffset(ZoneOffset.UTC),
    ip = client.ip,
    userAgent = client.userAgent,
    os = client.os,
    osVersion = client.osVersion,
    browser = client.browser,
    device = client.device,
    origin = client.origin,
    current = current,
    region = client.region,
)
