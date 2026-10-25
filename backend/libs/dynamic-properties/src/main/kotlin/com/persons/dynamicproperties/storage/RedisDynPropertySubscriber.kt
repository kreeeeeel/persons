package com.persons.dynamicproperties.storage

import com.fasterxml.jackson.module.kotlin.readValue
import com.persons.dynamicproperties.DynJson
import com.persons.dynamicproperties.domain.DynChange
import org.springframework.data.redis.connection.Message
import org.springframework.data.redis.connection.MessageListener
import org.springframework.data.redis.connection.SubscriptionListener

class RedisDynPropertySubscriber(
    private val receive: (DynChange) -> Unit,
    private val reload: () -> DynChange,
) : MessageListener,
    SubscriptionListener {
    override fun onMessage(
        message: Message,
        pattern: ByteArray?,
    ) {
        receive(DynJson.mapper.readValue(String(message.body, Charsets.UTF_8)))
    }

    override fun onChannelSubscribed(
        channel: ByteArray,
        count: Long,
    ) {
        receive(reload())
    }
}
