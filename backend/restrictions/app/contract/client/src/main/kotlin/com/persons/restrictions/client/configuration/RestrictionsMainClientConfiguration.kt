package com.persons.restrictions.client.configuration

import com.persons.restrictions.client.RestrictionsClient
import com.persons.restrictions.client.configuration.properties.RestrictionsClientProperties
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(RestrictionsClientProperties::class)
class RestrictionsMainClientConfiguration {
    @Bean
    fun restrictionsClientFactory(properties: RestrictionsClientProperties): RestrictionsMainClientFactory =
        RestrictionsMainClientFactory(properties)

    @Bean
    fun restrictionsClient(
        factory: RestrictionsMainClientFactory,
        @Value("\${project.internal.jwt-secret}") key: String,
    ): RestrictionsClient = factory.create({ key })
}
