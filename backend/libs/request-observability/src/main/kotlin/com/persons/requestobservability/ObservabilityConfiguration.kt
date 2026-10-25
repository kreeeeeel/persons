package com.persons.requestobservability

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.boot.autoconfigure.AutoConfiguration
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.core.Ordered

@AutoConfiguration
@EnableConfigurationProperties(ObservabilityProperties::class, InternalTokenProperties::class)
class ObservabilityConfiguration {
    @Bean
    fun requestMetadata(properties: InternalTokenProperties): RequestMetadata = RequestMetadata(properties.jwtSecret)

    @Bean
    fun bodyRedactor(mapper: ObjectMapper, properties: ObservabilityProperties): BodyRedactor =
        BodyRedactor(mapper, properties)

    @Bean
    fun requestLogFilter(
        properties: ObservabilityProperties,
        redactor: BodyRedactor,
        mapper: ObjectMapper,
        metadata: RequestMetadata,
    ): FilterRegistrationBean<RequestLogFilter> =
        FilterRegistrationBean(RequestLogFilter(properties, redactor, mapper, metadata)).apply {
            order = Ordered.HIGHEST_PRECEDENCE
        }
}
