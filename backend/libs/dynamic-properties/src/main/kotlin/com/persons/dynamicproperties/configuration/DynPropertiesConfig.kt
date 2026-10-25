package com.persons.dynamicproperties.configuration

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("dynamic-properties")
data class DynPropertiesConfig(
    val storage: String = "redis",
    val redisHost: String = "localhost",
    val redisPort: Int = 6379,
    val redisPassword: String = "",
    val prefix: String = "persons:dyn-properties",
)
