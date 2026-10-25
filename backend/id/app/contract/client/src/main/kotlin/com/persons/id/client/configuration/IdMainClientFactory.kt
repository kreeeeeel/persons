package com.persons.id.client.configuration

import com.persons.id.client.IdClient
import com.persons.id.client.configuration.properties.IdClientProperties
import com.persons.id.client.generated.api.IdApi
import com.persons.requestobservability.SignedJwt
import io.netty.channel.ChannelOption
import org.slf4j.MDC
import org.springframework.http.client.reactive.ReactorClientHttpConnector
import org.springframework.web.reactive.function.client.ClientRequest
import org.springframework.web.reactive.function.client.WebClient
import reactor.netty.http.client.HttpClient
import java.time.Duration
import java.util.UUID

class IdMainClientFactory(private val properties: IdClientProperties) {
    fun create(serviceKey: () -> String, sessionToken: () -> String? = { null }): IdClient {
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
                    .header("X-Service-Authorization", "Bearer ${SignedJwt(serviceKey()).service("id-client")}")
                    .header("X-Request-ID", MDC.get("requestId") ?: UUID.randomUUID().toString())
                val token = sessionToken()

                if (token != null) {
                    builder.header("Authorization", "Bearer $token")
                }

                next.exchange(builder.build())
            }
            .build()

        return IdClient(IdApi(client), com.persons.id.client.generated.api.AdminApi(client))
    }
}
