package com.persons.leetify.configuration

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.leetify.LeetifyClient
import com.persons.leetify.component.HttpLeetifyClient
import com.persons.leetify.component.LeetifyHttp
import com.persons.leetify.component.LeetifyParser
import org.springframework.boot.autoconfigure.AutoConfiguration
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean

@AutoConfiguration
@EnableConfigurationProperties(LeetifyProperties::class)
class LeetifyAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean
    fun leetifyHttp(properties: LeetifyProperties): LeetifyHttp = LeetifyHttp(properties)

    @Bean
    @ConditionalOnMissingBean
    fun leetifyParser(mapper: ObjectMapper): LeetifyParser = LeetifyParser(mapper)

    @Bean
    @ConditionalOnMissingBean(LeetifyClient::class)
    fun leetifyClient(
        http: LeetifyHttp,
        parser: LeetifyParser,
    ): LeetifyClient = HttpLeetifyClient(http, parser)
}
