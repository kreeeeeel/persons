package com.persons.person.component

import com.persons.id.client.configuration.IdMainClientFactory
import com.persons.id.client.generated.model.UserProfile
import com.persons.person.configuration.properties.InternalProperties
import com.persons.person.exception.impl.NotFoundException
import com.persons.person.exception.impl.UnavailableException
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClientRequestException
import org.springframework.web.reactive.function.client.WebClientResponseException
import java.time.Duration
import java.util.UUID
import java.util.stream.Collectors

private const val LOOKUP_LIMIT = 100
private const val TIMEOUT_SECONDS = 10L

@Component
class AccountProfiles(factory: IdMainClientFactory, properties: InternalProperties) {
    private val client = factory.create({ properties.jwtSecret }).api

    fun profiles(ids: Set<UUID>): Map<UUID, UserProfile> = ids.chunked(LOOKUP_LIMIT).stream()
        .flatMap { batch ->
            upstream { client.getUserProfiles(batch).block(Duration.ofSeconds(TIMEOUT_SECONDS)) }.stream()
        }.collect(Collectors.toMap({ it.id }, { it }))

    fun avatar(id: UUID): ByteArray = upstream {
        client.getUserAvatar(id).block(Duration.ofSeconds(TIMEOUT_SECONDS))
    }

    private fun <T> upstream(load: () -> T?): T = try {
        load() ?: throw UnavailableException()
    } catch (exception: WebClientResponseException) {
        if (exception.statusCode.value() == 404) throw NotFoundException()
        throw UnavailableException(cause = exception)
    } catch (exception: WebClientRequestException) {
        throw UnavailableException(cause = exception)
    }
}
