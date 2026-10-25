package com.persons.id.configuration

import com.persons.id.configuration.properties.YandexOAuthProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.web.client.RestClient
import java.net.http.HttpClient
import java.time.Duration

@Configuration
class OAuthHttpConfiguration {
    @Bean
    fun yandexOAuthClient(properties: YandexOAuthProperties): RestClient {
        val timeout = Duration.ofMillis(properties.timeoutMillis)
        val transport = HttpClient.newBuilder().connectTimeout(timeout).build()
        val factory = JdkClientHttpRequestFactory(transport)

        factory.setReadTimeout(timeout)

        return RestClient.builder().requestFactory(factory).build()
    }
}
