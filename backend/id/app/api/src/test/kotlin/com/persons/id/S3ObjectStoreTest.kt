package com.persons.id

import com.persons.id.component.S3ObjectStore
import com.persons.id.configuration.S3Configuration
import com.persons.id.configuration.properties.S3Credentials
import com.persons.id.configuration.properties.S3Properties
import com.persons.id.exception.impl.StorageUnavailableException
import com.sun.net.httpserver.HttpServer
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.net.InetSocketAddress
import java.util.concurrent.CopyOnWriteArrayList

private const val BYTES_1: Byte = 1
private const val BYTES_2: Byte = 2
private const val BYTES_3: Byte = 3
private const val EPHEMERAL_PORT = 0
private const val HTTP_OK = 200
private const val EMPTY_RESPONSE_LENGTH = 1L
private const val HTTP_NO_CONTENT = 204
private const val STOP_DELAY_SECONDS = 0
private const val BYTE_ARRAY_1 = 1
private const val PUT = "PUT"
private const val GET = "GET"
private const val DELETE = "DELETE"

private const val MAX_AVATAR_BYTES = 300_000
private const val BUCKET = "tests"
private const val KEY = "Persons/User-image/test/avatar.jpg"

class S3ObjectStoreTest {
    @Test
    fun `uses signed path style S3 requests with private JPEG content`() {
        val methods = CopyOnWriteArrayList<String>()
        val bytes = byteArrayOf(BYTES_1.toByte(), BYTES_2.toByte(), BYTES_3)
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", EPHEMERAL_PORT), EPHEMERAL_PORT)

        server.createContext("/$BUCKET/$KEY") { request ->
            methods.add(request.requestMethod)
            assertThat(request.requestHeaders.getFirst("Authorization")).startsWith("AWS4-HMAC-SHA256 ")
            when (request.requestMethod) {
                PUT -> {
                    assertThat(request.requestHeaders.getFirst("Content-Type")).isEqualTo("image/jpeg")
                    assertThat(request.requestHeaders.getFirst("Cache-Control")).isEqualTo("private, no-store")
                    assertThat(request.requestBody.readAllBytes()).isEqualTo(bytes)
                    request.sendResponseHeaders(HTTP_OK, -EMPTY_RESPONSE_LENGTH)
                }
                GET -> {
                    request.sendResponseHeaders(HTTP_OK, bytes.size.toLong())
                    request.responseBody.write(bytes)
                }
                else -> request.sendResponseHeaders(HTTP_NO_CONTENT, -EMPTY_RESPONSE_LENGTH)
            }
            request.close()
        }
        server.start()
        try {
            val properties = S3Properties(
                "http://127.0.0.1:${server.address.port}",
                "us-east-1",
                BUCKET,
                S3Credentials("tests-access", "tests-secret"),
            )

            S3Configuration().s3Client(properties).use { client ->
                val storage = S3ObjectStore(client, properties)

                storage.put(KEY, bytes)
                assertThat(storage.get(KEY)).isEqualTo(bytes)
                storage.delete(KEY)
            }
            assertThat(methods).containsExactly(PUT, GET, DELETE)
        } finally {
            server.stop(STOP_DELAY_SECONDS)
        }
    }

    @Test
    fun `bounds downloaded objects even if bucket content is unexpectedly larger`() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", EPHEMERAL_PORT), EPHEMERAL_PORT)

        server.createContext("/$BUCKET/$KEY") { request ->
            request.sendResponseHeaders(HTTP_OK, (MAX_AVATAR_BYTES + EMPTY_RESPONSE_LENGTH).toLong())
            request.responseBody.write(ByteArray(MAX_AVATAR_BYTES + BYTE_ARRAY_1))
            request.close()
        }
        server.start()
        try {
            val properties = S3Properties(
                "http://127.0.0.1:${server.address.port}",
                "us-east-1",
                BUCKET,
                S3Credentials("tests-access", "tests-secret"),
            )

            S3Configuration().s3Client(properties).use { client ->
                assertThatThrownBy {
                    S3ObjectStore(client, properties).get(KEY)
                }.isInstanceOf(StorageUnavailableException::class.java)
            }
        } finally {
            server.stop(STOP_DELAY_SECONDS)
        }
    }
}
