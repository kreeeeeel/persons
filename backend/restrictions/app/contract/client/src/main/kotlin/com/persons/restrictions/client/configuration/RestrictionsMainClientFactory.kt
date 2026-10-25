package com.persons.restrictions.client.configuration

import com.persons.requestobservability.SignedJwt
import com.persons.restrictions.client.RestrictionsClient
import com.persons.restrictions.client.configuration.properties.RestrictionsClientProperties
import com.persons.restrictions.client.generated.api.RestrictionsApi
import io.netty.channel.ChannelOption
import org.slf4j.MDC
import org.springframework.http.client.reactive.ReactorClientHttpConnector
import org.springframework.web.reactive.function.client.ClientRequest
import org.springframework.web.reactive.function.client.WebClient
import reactor.netty.http.client.HttpClient
import java.time.Duration
import java.util.UUID

class RestrictionsMainClientFactory(private val properties: RestrictionsClientProperties) {
    fun create(serviceKey: () -> String, sessionToken: () -> String? = { null }): RestrictionsClient {
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
                    .header(
                        "X-Service-Authorization",
                        "Bearer ${SignedJwt(serviceKey()).service("restrictions-client")}",
                    )
                    .header("X-Request-ID", MDC.get("requestId") ?: UUID.randomUUID().toString())
                val token = sessionToken()

                if (token != null) {
                    builder.header("Authorization", "Bearer $token")
                }

                next.exchange(builder.build())
            }
            .build()

        return RestrictionsClient(RestrictionsApi(client))
    }
}
