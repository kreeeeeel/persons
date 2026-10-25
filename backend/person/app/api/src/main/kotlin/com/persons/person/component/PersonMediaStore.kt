package com.persons.person.component

import com.persons.person.configuration.properties.S3Properties
import com.persons.person.domain.ByteWindow
import com.persons.person.domain.ErrorCode
import com.persons.person.exception.impl.NotFoundException
import com.persons.person.exception.impl.UnavailableException
import org.slf4j.LoggerFactory
import org.springframework.core.io.InputStreamResource
import org.springframework.core.io.Resource
import org.springframework.stereotype.Component
import software.amazon.awssdk.core.exception.SdkException
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.http.ContentStreamProvider
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.NoSuchKeyException
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import java.io.InputStream
import java.time.Duration

private val UPLOAD_TIMEOUT = Duration.ofMinutes(5)
private val logger = LoggerFactory.getLogger(PersonMediaStore::class.java)

@Component
class PersonMediaStore(private val s3: S3Client, private val properties: S3Properties) {
    fun put(key: String, type: String, size: Long, source: () -> InputStream) {
        try {
            s3.putObject(
                PutObjectRequest.builder().bucket(properties.bucket).key(key).contentType(type)
                    .cacheControl("private, no-store")
                    .overrideConfiguration { it.apiCallTimeout(UPLOAD_TIMEOUT) }.build(),
                RequestBody.fromContentProvider(ContentStreamProvider { source() }, size, type),
            )
        } catch (exception: SdkException) {
            logger.warn(
                "Media storage upload failed: type={}, cause={}",
                exception.javaClass.simpleName, exception.cause?.javaClass?.simpleName,
            )
            throw UnavailableException(ErrorCode.STORAGE_UNAVAILABLE, exception)
        }
    }

    fun read(key: String, window: ByteWindow?): Resource {
        val request = GetObjectRequest.builder().bucket(properties.bucket).key(key)

        if (window != null) {
            request.range("bytes=${window.start}-${window.end}")
        }

        return try {
            InputStreamResource(s3.getObject(request.build()))
        } catch (exception: NoSuchKeyException) {
            throw NotFoundException(ErrorCode.CONTENT_NOT_FOUND, exception)
        } catch (exception: SdkException) {
            throw UnavailableException(ErrorCode.STORAGE_UNAVAILABLE, exception)
        }
    }

    fun delete(key: String) {
        try {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(properties.bucket).key(key).build())
        } catch (exception: SdkException) {
            throw UnavailableException(ErrorCode.STORAGE_UNAVAILABLE, exception)
        }
    }
}
