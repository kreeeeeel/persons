package com.persons.dynamicproperties.storage

import com.fasterxml.jackson.module.kotlin.readValue
import com.persons.dynamicproperties.DynJson
import com.persons.dynamicproperties.DynSchema
import com.persons.dynamicproperties.domain.DynChange
import com.persons.dynamicproperties.domain.DynRecord
import com.persons.dynamicproperties.domain.DynSpec
import com.persons.dynamicproperties.exception.DynPropertyException
import jakarta.annotation.PreDestroy
import org.springframework.core.io.ClassPathResource
import org.springframework.dao.DataAccessException
import org.springframework.data.redis.connection.RedisConnectionFactory
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.script.DefaultRedisScript
import org.springframework.data.redis.listener.ChannelTopic
import org.springframework.data.redis.listener.RedisMessageListenerContainer
import java.time.Instant
import java.util.concurrent.CopyOnWriteArrayList

class RedisDynPropertyBackend(
    private val redis: StringRedisTemplate,
    connectionFactory: RedisConnectionFactory,
    prefix: String,
) : DynPropertyBackend {
    private val records = "$prefix:records"
    private val owners = "$prefix:owners"
    private val scopes = "$prefix:scopes"
    private val revision = "$prefix:revision"
    private val channel = "$prefix:changes"
    private val listeners = CopyOnWriteArrayList<(DynChange) -> Unit>()
    private val container = RedisMessageListenerContainer().apply { setConnectionFactory(connectionFactory) }
    private var started = false
    private val reconcileScript =
        DefaultRedisScript(
            ClassPathResource("dyn-properties/reconcile.lua").getContentAsString(Charsets.UTF_8),
            List::class.java,
        )
    private val updateScript =
        DefaultRedisScript(
            ClassPathResource("dyn-properties/update.lua").getContentAsString(Charsets.UTF_8),
            String::class.java,
        )
    private val snapshotScript =
        DefaultRedisScript(
            ClassPathResource("dyn-properties/snapshot.lua").getContentAsString(Charsets.UTF_8),
            String::class.java,
        )

    override fun reconcile(
        scope: String,
        definitions: List<DynSpec>,
    ): List<DynRecord> {
        definitions.stream().forEach { DynSchema.validate(it, it.defaultValue) }
        val result =
            redis
                .execute(
                    reconcileScript,
                    listOf(records, owners, scopes, revision, channel),
                    scope,
                    DynJson.mapper.writeValueAsString(definitions),
                    Instant.now().toString(),
                ).orEmpty()
        return result.stream().map { DynJson.mapper.readValue<DynRecord>(it.toString()) }.toList()
    }

    override fun snapshot(): List<DynRecord> = snapshotChange().records

    override fun snapshotChange(): DynChange =
        DynJson.mapper.readValue(
            redis.execute(snapshotScript, listOf(records, revision)) ?: throw DynPropertyException("SNAPSHOT_UNAVAILABLE"),
        )

    override fun update(
        key: String,
        value: String,
        revision: Long?,
        actor: String,
    ): DynRecord {
        val raw = redis.opsForHash<String, String>().get(records, key) ?: throw DynPropertyException("UNKNOWN_KEY")
        val current = DynJson.mapper.readValue<DynRecord>(raw)
        val normalized = DynSchema.validate(current.definition, value).toString()
        try {
            val result =
                redis.execute(
                    updateScript,
                    listOf(records, this.revision, channel),
                    key,
                    (revision ?: current.revision).toString(),
                    normalized,
                    Instant.now().toString(),
                    actor,
                ) ?: throw DynPropertyException("UNAVAILABLE")
            return DynJson.mapper.readValue(result)
        } catch (exception: DataAccessException) {
            if (exception.message.orEmpty().contains("DYN_CONFLICT")) {
                throw DynPropertyException("CONFLICT", exception)
            }
            if (exception.message.orEmpty().contains("DYN_UNKNOWN_KEY")) {
                throw DynPropertyException("UNKNOWN_KEY", exception)
            }
            throw DynPropertyException("UNAVAILABLE", exception)
        }
    }

    @Synchronized
    override fun subscribe(listener: (DynChange) -> Unit): AutoCloseable {
        listeners.add(listener)
        if (!started) {
            container.addMessageListener(
                RedisDynPropertySubscriber(
                    { change -> listeners.stream().forEach { it(change) } },
                    ::snapshotChange,
                ),
                ChannelTopic(channel),
            )
            container.afterPropertiesSet()
            container.start()
            started = true
        }
        return AutoCloseable { listeners.remove(listener) }
    }

    @PreDestroy
    fun close() {
        container.stop()
        container.destroy()
    }
}
