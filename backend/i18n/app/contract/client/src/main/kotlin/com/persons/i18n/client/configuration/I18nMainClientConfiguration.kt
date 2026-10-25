package com.persons.i18n.client.configuration

import com.persons.i18n.client.I18nClient
import com.persons.i18n.client.configuration.properties.I18nClientProperties
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(I18nClientProperties::class)
class I18nMainClientConfiguration {
    @Bean
    fun i18nClientFactory(properties: I18nClientProperties): I18nMainClientFactory = I18nMainClientFactory(properties)

    @Bean
    fun i18nClient(factory: I18nMainClientFactory, @Value("\${project.internal.jwt-secret}") key: String): I18nClient =
        factory.create({ key })
}
