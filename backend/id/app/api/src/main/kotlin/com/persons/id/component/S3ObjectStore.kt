package com.persons.id.component

import com.persons.id.configuration.properties.S3Properties
import com.persons.id.exception.impl.AvatarNotFoundException
import com.persons.id.exception.impl.StorageUnavailableException
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import software.amazon.awssdk.core.exception.SdkException
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.NoSuchKeyException
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.model.S3Exception
import java.io.IOException

private const val BYTES = 1

private const val MAX_DOWNLOAD_BYTES = 300_000
private const val AVATAR_CONTENT_TYPE = "image/jpeg"
private val logger = LoggerFactory.getLogger(S3ObjectStore::class.java)

@Component
class S3ObjectStore(private val client: S3Client, private val properties: S3Properties) {
    fun put(key: String, bytes: ByteArray) {
        storageCall {
            client.putObject(
                PutObjectRequest.builder().bucket(properties.bucket).key(key)
                    .contentType(AVATAR_CONTENT_TYPE).cacheControl("private, no-store").build(),
                RequestBody.fromBytes(bytes),
            )
        }
    }

    fun get(key: String): ByteArray = storageCall {
        client.getObject(GetObjectRequest.builder().bucket(properties.bucket).key(key).build()).use { input ->
            if (input.response().contentLength() > MAX_DOWNLOAD_BYTES) {
                throw StorageUnavailableException()
            }

            val bytes = input.readNBytes(MAX_DOWNLOAD_BYTES + BYTES)

            if (bytes.size > MAX_DOWNLOAD_BYTES) {
                throw StorageUnavailableException()
            }

            bytes
        }
    }

    fun delete(key: String) {
        storageCall { client.deleteObject(DeleteObjectRequest.builder().bucket(properties.bucket).key(key).build()) }
    }

    private fun <T> storageCall(operation: () -> T): T = try {
        operation()
    } catch (exception: NoSuchKeyException) {
        throw AvatarNotFoundException(exception)
    } catch (exception: S3Exception) {
        logger.warn(
            "S3 operation failed: status={}, code={}",
            exception.statusCode(),
            exception.awsErrorDetails()?.errorCode(),
        )
        throw StorageUnavailableException(exception)
    } catch (exception: SdkException) {
        throw StorageUnavailableException(exception)
    } catch (exception: IOException) {
        throw StorageUnavailableException(exception)
    }
}
