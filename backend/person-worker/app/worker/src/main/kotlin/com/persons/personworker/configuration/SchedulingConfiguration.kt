package com.persons.personworker.configuration

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Configuration
import org.springframework.scheduling.annotation.EnableScheduling

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = ["jobs.enabled"], havingValue = "true", matchIfMissing = true)
@EnableScheduling
class SchedulingConfiguration
