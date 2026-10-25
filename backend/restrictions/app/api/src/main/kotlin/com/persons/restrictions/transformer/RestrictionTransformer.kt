package com.persons.restrictions.transformer

import com.persons.restrictions.contract.dto.AccountRestriction
import com.persons.restrictions.contract.dto.RestrictionInput
import com.persons.restrictions.dao.entity.AccountRestrictionEntity
import com.persons.restrictions.domain.Restriction
import com.persons.restrictions.domain.RestrictionChange
import com.persons.restrictions.domain.RestrictionScope
import java.time.ZoneOffset
import java.util.stream.Collectors

fun AccountRestrictionEntity.toDomain(): Restriction = Restriction(
    id, userId, scopes.toSet(), reason, createdBy, createdAt, expiresAt, revoked, revision,
)

fun Restriction.toDto(): AccountRestriction = AccountRestriction(
    id, userId,
    scopes.stream().map {
        com.persons.restrictions.contract.dto.RestrictionScope.valueOf(it.name)
    }.toList(),
    reason, expiresAt = expiresAt?.atOffset(ZoneOffset.UTC), createdAt = createdAt.atOffset(ZoneOffset.UTC),
)

fun RestrictionInput.toDomain(): RestrictionChange = RestrictionChange(
    scopes.stream().map {
        RestrictionScope.valueOf(it.name)
    }.collect(Collectors.toSet()),
    reason, expiresAt?.toInstant(),
)
