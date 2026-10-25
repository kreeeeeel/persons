package com.persons.dynamicproperties.configuration

import com.persons.dynamicproperties.component.DynPropertyRegistry
import com.persons.dynamicproperties.component.DynPropertyRuntime
import com.persons.dynamicproperties.component.DynPropertyService
import com.persons.dynamicproperties.controller.DynPropertiesController
import com.persons.dynamicproperties.controller.DynPropertyEventsController
import com.persons.dynamicproperties.controller.DynPropertyExceptionHandler
import com.persons.dynamicproperties.security.DynPropertyAuthorizer
import com.persons.dynamicproperties.security.IdDynPropertyAuthorizer
import com.persons.dynamicproperties.storage.DynPropertyBackend
import com.persons.dynamicproperties.storage.MemoryDynPropertyBackend
import com.persons.dynamicproperties.storage.RedisDynPropertyBackend
import com.persons.id.client.configuration.IdMainClientFactory
import jakarta.servlet.http.HttpServletRequest
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.autoconfigure.AutoConfiguration
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.ApplicationEventPublisher
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.PropertySource
import org.springframework.core.env.Environment
import org.springframework.core.env.Profiles
import org.springframework.data.redis.connection.RedisPassword
import org.springframework.data.redis.connection.RedisStandaloneConfiguration
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory
import org.springframework.data.redis.core.StringRedisTemplate

@AutoConfiguration(before = [RedisAutoConfiguration::class])
@PropertySource("classpath:persons-dynamic-properties.properties")
@EnableConfigurationProperties(DynPropertiesConfig::class)
@Import(DynPropertyExceptionHandler::class)
class DynamicPropertiesAutoConfiguration {
    @Bean
    fun dynPropertyRegistry(): DynPropertyRegistry = DynPropertyRegistry()

    @Bean
    @ConditionalOnProperty(prefix = "dynamic-properties", name = ["storage"], havingValue = "memory")
    fun memoryDynPropertyBackend(environment: Environment): DynPropertyBackend {
        if (environment.acceptsProfiles(Profiles.of("production", "prod"))) {
            throw com.persons.dynamicproperties.exception
                .DynPropertyException("MEMORY_STORAGE_FORBIDDEN")
        }
        return MemoryDynPropertyBackend()
    }

    @Bean("dynPropertyRedisConnection")
    @ConditionalOnProperty(prefix = "dynamic-properties", name = ["storage"], havingValue = "redis", matchIfMissing = true)
    fun dynPropertyRedisConnection(config: DynPropertiesConfig): LettuceConnectionFactory {
        val connection = RedisStandaloneConfiguration(config.redisHost, config.redisPort)
        connection.password = RedisPassword.of(config.redisPassword)
        return LettuceConnectionFactory(connection)
    }

    @Bean
    @ConditionalOnProperty(prefix = "dynamic-properties", name = ["storage"], havingValue = "redis", matchIfMissing = true)
    fun redisDynPropertyBackend(
        @Qualifier("dynPropertyRedisConnection") connection: LettuceConnectionFactory,
        config: DynPropertiesConfig,
    ): DynPropertyBackend = RedisDynPropertyBackend(StringRedisTemplate(connection), connection, config.prefix)

    @Bean
    fun dynPropertyRuntime(
        registry: DynPropertyRegistry,
        backend: DynPropertyBackend,
        events: ApplicationEventPublisher,
        environment: Environment,
    ): DynPropertyRuntime = DynPropertyRuntime(registry, backend, events, environment.getRequiredProperty("spring.application.name"))

    @Bean
    fun dynPropertyService(
        registry: DynPropertyRegistry,
        backend: DynPropertyBackend,
        events: ApplicationEventPublisher,
    ): DynPropertyService = DynPropertyService(registry, backend, events)

    @Bean
    @ConditionalOnBean(IdMainClientFactory::class)
    @ConditionalOnMissingBean(DynPropertyAuthorizer::class)
    fun dynPropertyAuthorizer(
        factory: IdMainClientFactory,
        request: HttpServletRequest,
        environment: Environment,
    ): DynPropertyAuthorizer = IdDynPropertyAuthorizer(factory, request, environment.getRequiredProperty("project.internal.jwt-secret"))

    @Bean
    @ConditionalOnBean(DynPropertyAuthorizer::class)
    fun dynPropertiesController(
        service: DynPropertyService,
        authorizer: DynPropertyAuthorizer,
    ): DynPropertiesController = DynPropertiesController(service, authorizer)

    @Bean(initMethod = "start")
    fun dynPropertyEventsController(service: DynPropertyService): DynPropertyEventsController = DynPropertyEventsController(service)
}
