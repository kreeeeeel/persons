package com.persons.dynamicproperties

import java.nio.ByteBuffer
import java.security.MessageDigest

data class Rollout(
    val percentage: Int,
) {
    fun enabledFor(value: String): Boolean =
        Integer.toUnsignedLong(
            ByteBuffer.wrap(MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))).int,
        ) % 100 < percentage
}
