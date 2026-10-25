package com.persons.restrictions.configuration.properties

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

@ConfigurationProperties("project.restriction-cache")
data class CacheProperties(val ttl: Duration = Duration.ofSeconds(30))
