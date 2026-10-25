package com.persons.gateway.component

import com.persons.gateway.configuration.properties.InternalProperties
import com.persons.id.client.configuration.IdMainClientFactory
import com.persons.id.client.generated.api.AdminApi
import jakarta.servlet.http.HttpServletRequest
import org.springframework.stereotype.Component
import reactor.core.publisher.Mono
import java.util.UUID

private const val AUTHORIZATION = "Authorization"
private const val BEARER = "Bearer "

@Component
class AdminAccountGateway(
    private val actors: ActorResolver,
    private val factory: IdMainClientFactory,
    private val request: HttpServletRequest,
    private val properties: InternalProperties,
) {
    fun avatar(id: UUID): Mono<ByteArray> {
        actors.administrator()
        return factory.create({ properties.jwtSecret }).api.getUserAvatar(id)
    }

    fun api(): AdminApi {
        actors.administrator()
        val token = request.getHeader(AUTHORIZATION).removePrefix(BEARER)
        return factory.create({ properties.jwtSecret }, { token }).admin
    }
}
