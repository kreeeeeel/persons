package com.persons.person

import com.persons.person.component.PersonMediaStore
import com.persons.person.configuration.properties.S3Credentials
import com.persons.person.configuration.properties.S3Properties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.model.PutObjectResponse
import java.io.ByteArrayInputStream

class PersonMediaStoreTest {
    @Test
    fun `opens a fresh upload stream for checksums and retries without buffering the whole file`() {
        val client = Mockito.mock(S3Client::class.java)
        val bytes = byteArrayOf(1, 2, 3, 4)
        Mockito.`when`(client.putObject(any(PutObjectRequest::class.java), any(RequestBody::class.java)))
            .thenAnswer { invocation ->
                val body = invocation.getArgument<RequestBody>(1)
                val first = body.contentStreamProvider().newStream()
                assertThat(first.readAllBytes()).isEqualTo(bytes)
                first.close()
                body.contentStreamProvider().newStream().use {
                    assertThat(it.readAllBytes()).isEqualTo(bytes)
                }
                PutObjectResponse.builder().build()
            }
        val properties = S3Properties(
            "http://localhost:9000", "us-east-1", "persons", S3Credentials("test", "test"),
        )
        PersonMediaStore(client, properties).put("media/key", "video/mp4", bytes.size.toLong()) {
            ByteArrayInputStream(bytes)
        }
    }
}
