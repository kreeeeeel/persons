package com.persons.dynamicproperties

import com.persons.dynamicproperties.configuration.DynamicPropertiesAutoConfiguration
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.springframework.boot.autoconfigure.AutoConfigurations
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration
import org.springframework.boot.test.context.runner.ApplicationContextRunner
import org.springframework.data.redis.connection.RedisConnectionFactory
import org.springframework.data.redis.core.StringRedisTemplate
import java.util.UUID

@EnabledIfEnvironmentVariable(named = "REDIS_TEST_PORT", matches = "\\d+")
class DynPropertyAutoConfigurationTest {
    @Test
    fun `auto configuration owns the Redis connection and bootstraps private declarations before readiness`() {
        val prefix = "test:autoconfig:${UUID.randomUUID()}"
        ApplicationContextRunner()
            .withConfiguration(
                AutoConfigurations.of(
                    DynamicPropertiesAutoConfiguration::class.java,
                    RedisAutoConfiguration::class.java,
                ),
            ).withBean(DynPropertyFixture::class.java)
            .withPropertyValues(
                "spring.application.name=autoconfig-test",
                "dynamic-properties.redis-host=${System.getenv("REDIS_TEST_HOST") ?: "127.0.0.1"}",
                "dynamic-properties.redis-port=${System.getenv("REDIS_TEST_PORT")}",
                "dynamic-properties.prefix=$prefix",
            ).run { context ->
                assertThat(context).hasNotFailed()
                assertThat(context.getBeansOfType(RedisConnectionFactory::class.java)).hasSize(1)
                assertThat(context.getBean(DynPropertyFixture::class.java).enabled()).isTrue()
                val redis = context.getBean(StringRedisTemplate::class.java)
                assertThat(redis.opsForHash<String, String>().size("$prefix:records")).isEqualTo(2)
                redis.keys("$prefix:*").takeIf { it.isNotEmpty() }?.let { redis.delete(it) }
            }
    }
}
