package com.persons.person.client.configuration

import com.persons.person.client.PersonClient
import com.persons.person.client.configuration.properties.PersonClientProperties
import com.persons.person.client.generated.api.AccountsApi
import com.persons.person.client.generated.api.AchievementsApi
import com.persons.person.client.generated.api.AdminApi
import com.persons.person.client.generated.api.ClaimsApi
import com.persons.person.client.generated.api.EngagementApi
import com.persons.person.client.generated.api.GalleryApi
import com.persons.person.client.generated.api.InteractionsApi
import com.persons.person.client.generated.api.MediaApi
import com.persons.person.client.generated.api.NotificationsApi
import com.persons.person.client.generated.api.PersonsApi
import com.persons.person.client.generated.api.RestrictionsApi
import com.persons.requestobservability.SignedJwt
import io.netty.channel.ChannelOption
import org.slf4j.MDC
import org.springframework.http.client.reactive.ReactorClientHttpConnector
import org.springframework.web.reactive.function.client.ClientRequest
import org.springframework.web.reactive.function.client.WebClient
import reactor.netty.http.client.HttpClient
import java.time.Duration
import java.util.UUID

class PersonMainClientFactory(private val properties: PersonClientProperties) {
    fun create(serviceKey: () -> String, sessionToken: () -> String? = { null }): PersonClient {
        val transport = HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, properties.connectTimeoutMs)
            .responseTimeout(Duration.ofMillis(properties.readTimeoutMs))
            .compress(true)
        val client = WebClient.builder()
            .baseUrl(properties.baseUri)
            .clientConnector(ReactorClientHttpConnector(transport))
            .codecs { it.defaultCodecs().maxInMemorySize(properties.maxBufferSize) }
            .filter { request, next ->
                val builder = ClientRequest.from(request)
                    .header("X-Service-Authorization", "Bearer ${SignedJwt(serviceKey()).service("admin-client")}")
                    .header("X-Request-ID", MDC.get("requestId") ?: UUID.randomUUID().toString())
                val token = sessionToken()

                if (token != null) {
                    builder.header("Authorization", "Bearer $token")
                }

                next.exchange(builder.build())
            }
            .build()

        return PersonClient(
            PersonsApi(client),
            AdminApi(client),
            InteractionsApi(client),
            MediaApi(client),
            NotificationsApi(client),
            GalleryApi(client),
            ClaimsApi(client),
            AchievementsApi(client),
            AccountsApi(client),
            EngagementApi(client),
            RestrictionsApi(client),
        )
    }
}
