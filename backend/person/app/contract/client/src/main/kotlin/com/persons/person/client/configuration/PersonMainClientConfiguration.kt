package com.persons.person.client.configuration

import com.persons.person.client.PersonClient
import com.persons.person.client.configuration.properties.PersonClientProperties
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(PersonClientProperties::class)
class PersonMainClientConfiguration {
    @Bean
    fun personClientFactory(properties: PersonClientProperties): PersonMainClientFactory =
        PersonMainClientFactory(properties)

    @Bean
    fun personClient(
        factory: PersonMainClientFactory,
        @Value("\${project.internal.jwt-secret}") key: String,
    ): PersonClient = factory.create({ key })
}
