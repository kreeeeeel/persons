package com.persons.restrictions.component

import com.persons.restrictions.domain.Administrator
import com.persons.restrictions.domain.RestrictionScope
import com.persons.restrictions.exception.impl.ForbiddenException
import com.persons.restrictions.service.RestrictionStore
import org.springframework.stereotype.Component
import java.time.Clock

@Component
class AdministrativePolicy(
    private val store: RestrictionStore,
    private val administrators: AdministratorResolver,
    private val clock: Clock,
) {
    fun administrator(): Administrator {
        store.lockManagement()
        // Re-read the ID role after acquiring the shared policy lock.
        val actor = administrators.required()
        val restriction = store.find(listOf(actor.id)).firstOrNull()
        if (restriction?.effective(clock.instant()) == true && RestrictionScope.ACCOUNT in restriction.scopes) {
            throw ForbiddenException()
        }
        return actor
    }
}
