package com.persons.person

import com.persons.person.component.PersonMediaStore
import com.persons.person.configuration.properties.S3Credentials
import com.persons.person.configuration.properties.S3Properties
import com.sun.net.httpserver.HttpServer
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Timeout
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import java.io.ByteArrayInputStream
import java.net.InetSocketAddress
import java.net.URI
import java.time.Duration
import java.util.concurrent.atomic.AtomicReference

private const val RESPONSE_DELAY_MILLIS = 250L

class PersonMediaStoreTimeoutTest {
    @Test
    @Timeout(10)
    fun `upload survives a storage response slower than the default client call timeout`() {
        val received = AtomicReference<ByteArray>()
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/") { exchange ->
            received.set(exchange.requestBody.use { it.readAllBytes() })
            Thread.sleep(RESPONSE_DELAY_MILLIS)
            exchange.responseHeaders.add("ETag", "\"stored\"")
            exchange.sendResponseHeaders(200, -1)
            exchange.close()
        }
        server.start()
        val endpoint = "http://127.0.0.1:${server.address.port}"
        val properties = S3Properties(endpoint, "us-east-1", "persons", S3Credentials("test", "test"))

        try {
            S3Client.builder()
                .endpointOverride(URI.create(endpoint)).region(Region.US_EAST_1).forcePathStyle(true)
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create("test", "test")))
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
                .serviceConfiguration(
                    software.amazon.awssdk.services.s3.S3Configuration.builder()
                        .chunkedEncodingEnabled(false).build(),
                )
                .httpClientBuilder(UrlConnectionHttpClient.builder().socketTimeout(Duration.ofSeconds(2)))
                .overrideConfiguration { it.apiCallTimeout(Duration.ofMillis(50)) }
                .build().use { client ->
                    val bytes = byteArrayOf(1, 2, 3, 4)
                    PersonMediaStore(client, properties).put("media/slow.mp4", "video/mp4", bytes.size.toLong()) {
                        ByteArrayInputStream(bytes)
                    }
                    assertThat(received.get()).isEqualTo(bytes)
                }
        } finally {
            server.stop(0)
        }
    }
}
