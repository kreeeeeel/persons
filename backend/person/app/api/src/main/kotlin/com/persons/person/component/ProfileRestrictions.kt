package com.persons.person.component

import com.persons.person.configuration.properties.InternalProperties
import com.persons.person.contract.dto.AccountRestriction
import com.persons.person.contract.dto.RestrictionScope
import com.persons.person.exception.impl.UnavailableException
import com.persons.restrictions.client.configuration.RestrictionsMainClientFactory
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClientRequestException
import org.springframework.web.reactive.function.client.WebClientResponseException
import java.time.Duration
import java.util.UUID

@Component
class ProfileRestrictions(factory: RestrictionsMainClientFactory, properties: InternalProperties) {
    private val client = factory.create({ properties.jwtSecret }).api

    fun current(owner: UUID?): AccountRestriction? {
        if (owner == null) {
            return null
        }
        val result = try {
            client.getRestriction(owner).block(Duration.ofSeconds(10))
        } catch (exception: WebClientRequestException) {
            throw UnavailableException(cause = exception)
        } catch (exception: WebClientResponseException) {
            throw UnavailableException(cause = exception)
        }
        if (result == null) {
            throw UnavailableException()
        }
        val restriction = result.restriction ?: return null
        return AccountRestriction(
            restriction.id, restriction.userId,
            restriction.scopes.stream().map { RestrictionScope.valueOf(it.value) }.toList(),
            restriction.reason, restriction.createdAt, restriction.expiresAt,
        )
    }
}
