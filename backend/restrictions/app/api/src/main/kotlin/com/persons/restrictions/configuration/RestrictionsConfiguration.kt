package com.persons.restrictions.configuration

import com.persons.id.client.configuration.IdMainClientConfiguration
import com.persons.restrictions.configuration.properties.CacheProperties
import com.persons.restrictions.configuration.properties.InternalProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Import
import java.time.Clock

@Configuration(proxyBeanMethods = false)
@Import(IdMainClientConfiguration::class)
@EnableConfigurationProperties(InternalProperties::class, CacheProperties::class)
class RestrictionsConfiguration {
    @Bean
    fun clock(): Clock = Clock.systemUTC()
}
