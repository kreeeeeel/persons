package com.persons.gateway.exception.impl

import com.persons.person.contract.dto.AccountRestriction
import com.persons.person.contract.dto.RestrictionScope

class ActionRestrictedException(val restriction: AccountRestriction, val scope: RestrictionScope) : RuntimeException()
