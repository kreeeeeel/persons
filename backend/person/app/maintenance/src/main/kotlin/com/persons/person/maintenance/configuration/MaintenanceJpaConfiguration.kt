package com.persons.person.maintenance.configuration

import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@Configuration(proxyBeanMethods = false)
@EntityScan("com.persons.person.dao.entity", "com.persons.person.maintenance.dao.entity")
@EnableJpaRepositories("com.persons.person.maintenance.dao.repository")
class MaintenanceJpaConfiguration
