package com.persons.dynamicproperties

import com.persons.dynamicproperties.component.DynPropertyRegistry
import com.persons.dynamicproperties.component.DynPropertyRuntime
import com.persons.dynamicproperties.storage.RedisDynPropertyBackend
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.awaitility.Awaitility.await
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.springframework.context.ApplicationEventPublisher
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory
import org.springframework.data.redis.core.StringRedisTemplate
import java.time.Duration
import java.util.UUID

@EnabledIfEnvironmentVariable(named = "REDIS_TEST_PORT", matches = "\\d+")
class RedisDynPropertyIntegrationTest {
    @Test
    fun `Lua reconciles definitions and Redis notifications update a separate application cache`() {
        val connection = LettuceConnectionFactory(System.getenv("REDIS_TEST_HOST") ?: "127.0.0.1", System.getenv("REDIS_TEST_PORT").toInt())
        connection.afterPropertiesSet()
        connection.start()
        val redis = StringRedisTemplate(connection)
        val prefix = "test:dyn:${UUID.randomUUID()}"
        val writer = RedisDynPropertyBackend(redis, connection, prefix)
        val reader = RedisDynPropertyBackend(redis, connection, prefix)
        val property = DynPropertyFactory.createInteger("test.value", 10, 0, 100).build()
        val registry = DynPropertyRegistry()
        registry.register(property)
        val runtime = DynPropertyRuntime(registry, reader, ApplicationEventPublisher { }, "reader")
        try {
            runtime.afterSingletonsInstantiated()
            val initial = writer.snapshot().single()
            writer.update(initial.definition.key, "40", initial.revision, "admin")
            await().atMost(Duration.ofSeconds(5)).untilAsserted { assertThat(property.value).isEqualTo(40) }
            assertThatThrownBy { writer.update(initial.definition.key, "10", initial.revision, "admin") }
                .isInstanceOf(com.persons.dynamicproperties.exception.DynPropertyException::class.java)
            writer.reconcile("writer", listOf(property.definition.copy(description = "Changed")))
            assertThat(writer.snapshot().single().value).isEqualTo("40")
            writer.reconcile("writer", listOf(property.definition.copy(defaultValue = "20")))
            assertThat(writer.snapshot().single().value).isEqualTo("20")
            writer.reconcile("reader", emptyList())
            assertThat(writer.snapshot()).hasSize(1)
            writer.reconcile("writer", emptyList())
            val emptySnapshot = writer.snapshotChange()
            assertThat(emptySnapshot.records).isEmpty()
            assertThat(emptySnapshot.fullSnapshot).isTrue()
            assertThat(emptySnapshot.revision).isGreaterThan(initial.revision)
            await().atMost(Duration.ofSeconds(5)).untilAsserted {
                assertThat(registry.snapshot()).isEmpty()
                assertThat(property.value).isEqualTo(10)
            }
            runtime.close()
            writer.reconcile("writer", listOf(property.definition))
            val changedType = DynPropertyFactory.createString(property.definition.key, "new type").build().definition
            writer.reconcile("writer", listOf(changedType))
            assertThat(writer.snapshot().single().value).isEqualTo("\"new type\"")
            val snapshot = writer.snapshotChange()
            assertThat(snapshot.revision).isEqualTo(snapshot.records.single().revision)
        } finally {
            runtime.close()
            writer.close()
            reader.close()
            redis.keys("$prefix:*").takeIf { it.isNotEmpty() }?.let { redis.delete(it) }
            connection.destroy()
        }
    }
}
