package com.persons.id.component

import com.persons.id.configuration.properties.IdProperties
import org.springframework.stereotype.Component
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import java.util.HexFormat
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

private const val TOKEN_BYTES = 32
private const val CODE_UPPER_BOUND = 1_000_000
private const val CODE_LENGTH = 6

@Component
class SecureTokens(private val properties: IdProperties) {
    private val random = SecureRandom()

    fun token(): String {
        val bytes = ByteArray(TOKEN_BYTES)

        random.nextBytes(bytes)

        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    fun code(): String = random.nextInt(CODE_UPPER_BOUND).toString().padStart(CODE_LENGTH, '0')

    fun hash(value: String): String {
        val mac = Mac.getInstance("HmacSHA256")

        mac.init(SecretKeySpec(properties.pepper.toByteArray(), "HmacSHA256"))

        return HexFormat.of().formatHex(mac.doFinal(value.toByteArray()))
    }

    fun matches(value: String, hash: String): Boolean = MessageDigest.isEqual(
        hash(value).toByteArray(),
        hash.toByteArray(),
    )
}
