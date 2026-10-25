package com.persons.gateway.component

import com.persons.gateway.configuration.properties.InternalProperties
import com.persons.gateway.exception.impl.ActionRestrictedException
import com.persons.gateway.exception.impl.UnavailableException
import com.persons.gateway.transformer.toClient
import com.persons.gateway.transformer.toDto
import com.persons.id.client.configuration.IdMainClientFactory
import com.persons.person.contract.dto.AccountRestriction
import com.persons.person.contract.dto.AccountRestrictionPage
import com.persons.person.contract.dto.AdminUser
import com.persons.person.contract.dto.RestrictionInput
import com.persons.person.contract.dto.RestrictionScope
import com.persons.person.contract.dto.UpdateAccess
import com.persons.restrictions.client.configuration.RestrictionsMainClientFactory
import com.persons.restrictions.client.generated.model.RestrictionLookup
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClientRequestException
import java.time.Duration
import java.util.UUID

private val UPSTREAM_TIMEOUT = Duration.ofSeconds(10)
private val MANAGEMENT_TIMEOUT = Duration.ofSeconds(20)

@Component
class RestrictionsGateway(
    private val factory: RestrictionsMainClientFactory,
    private val properties: InternalProperties,
    private val actors: ActorResolver,
    private val identities: IdMainClientFactory,
) {
    fun page(page: Int, size: Int, query: String?, userId: UUID?): AccountRestrictionPage {
        actors.administrator()
        return call {
            val result = factory.create({ properties.jwtSecret }, actors::sessionToken).api
                .listActiveRestrictions(page = page, size = size, q = query, userId = userId).block(MANAGEMENT_TIMEOUT)
            if (result == null) throw UnavailableException()
            val ids = result.items.stream().map { it.userId }.distinct().toList()
            val profiles = if (ids.isEmpty()) {
                emptyMap()
            } else {
                val users = identities.create({ properties.jwtSecret }).api.getUserProfiles(ids).block(UPSTREAM_TIMEOUT)
                if (users == null) throw UnavailableException()
                users.associateBy { it.id }
            }
            AccountRestrictionPage(
                result.items.stream().map {
                    val profile = profiles[it.userId]
                    it.toDto().copy(
                        userName = profile?.name,
                        userAvatarUrl = profile?.takeIf { row ->
                            row.hasAvatar
                        }?.let { row ->
                            "/api/person/v1/authors/${row.id}/avatar?v=${row.version}"
                        },
                    )
                }.toList(),
                result.total, page, size,
            )
        }
    }

    fun current(userId: UUID): AccountRestriction? = call {
        val result = factory.create({ properties.jwtSecret }).api.getRestriction(userId).block(UPSTREAM_TIMEOUT)
        if (result == null) throw UnavailableException()
        result.restriction?.toDto()
    }

    fun lookup(userIds: Collection<UUID>): Map<UUID, AccountRestriction> {
        if (userIds.isEmpty()) return emptyMap()
        return call {
            val result = factory.create({ properties.jwtSecret }).api
                .lookupRestrictions(RestrictionLookup(userIds.toSet())).block(UPSTREAM_TIMEOUT)
            if (result == null) throw UnavailableException()
            result.stream().map { it.toDto() }.toList().associateBy { it.userId }
        }
    }

    fun ensure(userId: UUID, scope: RestrictionScope) {
        val restriction = current(userId)
        if (restriction != null && (RestrictionScope.ACCOUNT in restriction.scopes || scope in restriction.scopes)) {
            throw ActionRestrictedException(restriction, scope)
        }
    }

    fun set(userId: UUID, input: RestrictionInput): AccountRestriction {
        actors.administrator()
        return call {
            val result = factory.create({ properties.jwtSecret }, actors::sessionToken).api
                .setRestriction(userId, input.toClient()).block(MANAGEMENT_TIMEOUT)
            if (result == null) throw UnavailableException()
            result.toDto()
        }
    }

    fun revoke(userId: UUID) {
        actors.administrator()
        call {
            factory.create({ properties.jwtSecret }, actors::sessionToken).api
                .revokeRestriction(userId).block(MANAGEMENT_TIMEOUT)
        }
    }

    fun updateAccess(userId: UUID, input: UpdateAccess): AdminUser {
        actors.administrator()
        return call {
            val result = factory.create({ properties.jwtSecret }, actors::sessionToken).api
                .updateUserAccess(userId, input.toClient()).block(MANAGEMENT_TIMEOUT)
            if (result == null) throw UnavailableException()
            result.toDto()
        }
    }

    private fun <T> call(operation: () -> T): T = try {
        operation()
    } catch (exception: WebClientRequestException) {
        throw UnavailableException(exception)
    }
}
