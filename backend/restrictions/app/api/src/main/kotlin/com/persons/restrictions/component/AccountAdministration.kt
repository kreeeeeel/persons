package com.persons.restrictions.component

import com.persons.id.client.configuration.IdMainClientFactory
import com.persons.id.client.generated.model.AccountStatus
import com.persons.id.client.generated.model.UpdateAccess
import com.persons.restrictions.configuration.properties.InternalProperties
import com.persons.restrictions.domain.AccountRole
import com.persons.restrictions.domain.ManagedAccount
import com.persons.restrictions.exception.impl.UnavailableException
import com.persons.restrictions.transformer.toDomain
import jakarta.servlet.http.HttpServletRequest
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClientRequestException
import java.time.Duration
import java.util.UUID

private const val AUTHORIZATION = "Authorization"
private const val BEARER = "Bearer "
private val UPSTREAM_TIMEOUT = Duration.ofSeconds(5)

@Component
class AccountAdministration(
    private val factory: IdMainClientFactory,
    private val properties: InternalProperties,
    private val request: HttpServletRequest,
) {
    fun updateRole(userId: UUID, role: AccountRole): ManagedAccount {
        val token = request.getHeader(AUTHORIZATION).orEmpty().removePrefix(BEARER)
        val result = try {
            factory.create({ properties.jwtSecret }, { token }).admin.updateUserAccess(
                userId,
                UpdateAccess(
                    com.persons.id.client.generated.model.AccountRole.valueOf(role.name), AccountStatus.ACTIVE,
                ),
            )
                .block(UPSTREAM_TIMEOUT)
        } catch (exception: WebClientRequestException) {
            throw UnavailableException(exception)
        }
        if (result == null) throw UnavailableException()
        return result.toDomain()
    }
}
