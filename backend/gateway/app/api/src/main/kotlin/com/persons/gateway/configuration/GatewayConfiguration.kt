package com.persons.gateway.configuration

import com.persons.gateway.configuration.properties.GatewayProperties
import com.persons.gateway.configuration.properties.InternalProperties
import com.persons.id.client.configuration.IdMainClientConfiguration
import com.persons.restrictions.client.configuration.RestrictionsMainClientConfiguration
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Import
import java.net.http.HttpClient

@Configuration(proxyBeanMethods = false)
@Import(IdMainClientConfiguration::class, RestrictionsMainClientConfiguration::class)
@EnableConfigurationProperties(GatewayProperties::class, InternalProperties::class)
class GatewayConfiguration {
    @Bean
    fun upstreamClient(properties: GatewayProperties): HttpClient = HttpClient.newBuilder()
        .connectTimeout(properties.connectTimeout)
        .followRedirects(HttpClient.Redirect.NEVER)
        .version(HttpClient.Version.HTTP_1_1)
        .build()
}
