package com.persons.personworker.configuration

import com.persons.person.configuration.S3Configuration
import com.persons.person.maintenance.PersonAggregateStore
import com.persons.person.maintenance.configuration.MaintenanceJpaConfiguration
import com.persons.person.maintenance.games.CsMatchStore
import com.persons.person.maintenance.games.DotaMatchStore
import com.persons.restrictions.client.configuration.RestrictionsMainClientConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Import
import java.time.Clock

@Import(
    S3Configuration::class,
    PersonAggregateStore::class,
    DotaMatchStore::class,
    CsMatchStore::class,
    MaintenanceJpaConfiguration::class,
    RestrictionsMainClientConfiguration::class,
)
@Configuration(proxyBeanMethods = false)
class WorkerConfiguration {
    @Bean fun clock(): Clock = Clock.systemUTC()
}
