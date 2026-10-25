package com.persons.gateway.transformer

import com.persons.person.contract.dto.AccountRestriction
import com.persons.person.contract.dto.RestrictionInput
import com.persons.person.contract.dto.RestrictionScope
import java.util.stream.Collectors
import com.persons.restrictions.client.generated.model.AccountRestriction as ClientRestriction
import com.persons.restrictions.client.generated.model.RestrictionInput as ClientInput
import com.persons.restrictions.client.generated.model.RestrictionScope as ClientScope

fun ClientRestriction.toDto(): AccountRestriction = AccountRestriction(
    id, userId, scopes.stream().map { RestrictionScope.valueOf(it.value) }.toList(), reason,
    expiresAt = expiresAt, createdAt = createdAt,
)

fun RestrictionInput.toClient(): ClientInput = ClientInput(
    scopes.stream().map { ClientScope.valueOf(it.value) }.collect(Collectors.toSet()), reason, expiresAt,
)
