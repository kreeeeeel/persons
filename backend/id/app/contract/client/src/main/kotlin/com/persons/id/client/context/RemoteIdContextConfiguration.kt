package com.persons.id.client.context

import com.persons.id.client.configuration.IdMainClientConfiguration
import com.persons.id.client.configuration.IdMainClientFactory
import com.persons.idcontext.IdContextConfiguration
import com.persons.idcontext.SessionVerifier
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Import

@Configuration(proxyBeanMethods = false)
@Import(IdMainClientConfiguration::class, IdContextConfiguration::class)
class RemoteIdContextConfiguration {
    @Bean
    fun remoteSessionVerifier(
        factory: IdMainClientFactory,
        @Value("\${project.internal.jwt-secret}") secret: String,
    ): SessionVerifier = RemoteSessionVerifier(factory, secret)
}
