package com.persons.mail.client.configuration

import com.persons.mail.client.MailClient
import com.persons.mail.client.configuration.properties.MailClientProperties
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(MailClientProperties::class)
class MailMainClientConfiguration {
    @Bean
    fun mailClientFactory(properties: MailClientProperties): MailMainClientFactory = MailMainClientFactory(properties)

    @Bean
    fun mailClient(factory: MailMainClientFactory, @Value("\${project.internal.jwt-secret}") key: String): MailClient =
        factory.create({ key })
}
