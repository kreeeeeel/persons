package com.persons.person.configuration

import com.persons.id.client.configuration.IdMainClientConfiguration
import com.persons.person.configuration.properties.GatewayProperties
import com.persons.person.configuration.properties.InternalProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Import
import java.time.Clock

@Configuration(proxyBeanMethods = false)
@Import(IdMainClientConfiguration::class)
@EnableConfigurationProperties(InternalProperties::class, GatewayProperties::class)
class PersonConfiguration {
    @Bean
    fun clock(): Clock = Clock.systemUTC()
}
