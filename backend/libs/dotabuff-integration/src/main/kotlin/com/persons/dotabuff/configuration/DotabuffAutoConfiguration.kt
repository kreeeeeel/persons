package com.persons.dotabuff.configuration

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.dotabuff.DotaClient
import com.persons.dotabuff.SteamAccountResolver
import com.persons.dotabuff.component.DotabuffHttp
import com.persons.dotabuff.component.DotabuffParser
import com.persons.dotabuff.component.HttpOpenDotaClient
import com.persons.dotabuff.component.HttpSteamAccountResolver
import com.persons.dotabuff.component.OpenDotaParser
import org.springframework.boot.autoconfigure.AutoConfiguration
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean

@AutoConfiguration
@EnableConfigurationProperties(DotabuffProperties::class)
class DotabuffAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean
    fun dotabuffHttp(properties: DotabuffProperties): DotabuffHttp = DotabuffHttp(properties)

    @Bean
    @ConditionalOnMissingBean
    fun dotabuffParser(): DotabuffParser = DotabuffParser()

    @Bean
    @ConditionalOnMissingBean(DotaClient::class)
    fun dotaClient(
        http: DotabuffHttp,
        mapper: ObjectMapper,
    ): DotaClient = HttpOpenDotaClient(http, OpenDotaParser(mapper))

    @Bean
    @ConditionalOnMissingBean(SteamAccountResolver::class)
    fun steamAccountResolver(http: DotabuffHttp): SteamAccountResolver = HttpSteamAccountResolver(http)
}
