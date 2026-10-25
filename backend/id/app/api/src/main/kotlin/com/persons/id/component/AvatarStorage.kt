package com.persons.id.component

import com.persons.id.configuration.properties.S3Properties
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class AvatarStorage(private val storage: S3ObjectStore, private val properties: S3Properties) {
    fun put(userId: UUID, bytes: ByteArray): String {
        val key = "${properties.objectPrefix}/$userId/avatar.jpg"

        storage.put(key, bytes)

        return key
    }

    fun get(key: String): ByteArray = storage.get(key)
}
