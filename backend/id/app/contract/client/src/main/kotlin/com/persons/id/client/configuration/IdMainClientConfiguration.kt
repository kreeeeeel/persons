package com.persons.id.client.configuration

import com.persons.id.client.IdClient
import com.persons.id.client.configuration.properties.IdClientProperties
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(IdClientProperties::class)
class IdMainClientConfiguration {
    @Bean
    fun idClientFactory(properties: IdClientProperties): IdMainClientFactory = IdMainClientFactory(properties)

    @Bean
    fun idClient(factory: IdMainClientFactory, @Value("\${project.internal.jwt-secret}") key: String): IdClient =
        factory.create({ key })
}
