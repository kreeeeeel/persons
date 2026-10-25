package com.persons.personworker.component

import com.persons.person.configuration.properties.S3Properties
import com.persons.personworker.dao.VideoWorkRepository
import com.persons.personworker.domain.VideoWork
import com.persons.personworker.exception.VideoProcessingException
import org.springframework.stereotype.Component
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import java.nio.file.Files
import java.time.Duration
import java.util.Comparator

private const val VIDEO_CONTENT_TYPE = "video/mp4"
private const val VIDEO_QUALITIES_PREFIX = "video/qualities"
private val STORAGE_TIMEOUT = Duration.ofMinutes(5)

@Component
class VideoTranscoder(
    private val rows: VideoWorkRepository,
    private val encoder: VideoEncoder,
    private val s3: S3Client,
    private val properties: S3Properties,
) {
    fun process(work: VideoWork) {
        val directory = Files.createTempDirectory("persons-video-")
        try {
            val input = directory.resolve("original")
            s3.getObject(
                GetObjectRequest.builder().bucket(properties.bucket).key(work.key).overrideConfiguration {
                    it.apiCallTimeout(STORAGE_TIMEOUT)
                }.build(),
            ).use { source -> Files.copy(source, input) }
            val dimensions = encoder.dimensions(input)
            val preview = encoder.preview(input, dimensions)
            val previewKey = "video/previews/${work.id}/${work.token}.jpg"
            rows.prepare(previewKey)
            s3.putObject(
                PutObjectRequest.builder().bucket(properties.bucket).key(previewKey)
                    .contentType("image/jpeg").cacheControl("private, no-store").overrideConfiguration {
                        it.apiCallTimeout(STORAGE_TIMEOUT)
                    }.build(),
                RequestBody.fromFile(preview),
            )
            rows.metadata(work, dimensions.duration, previewKey, Files.size(preview))
            encoder.heights(dimensions).stream().forEach { height ->
                if (!rows.current(work)) {
                    throw VideoProcessingException("Video job is no longer current")
                }
                val encoded = encoder.encode(input, height)
                if (!rows.current(work)) {
                    throw VideoProcessingException("Video job is no longer current")
                }
                val key = "$VIDEO_QUALITIES_PREFIX/${work.id}/${work.token}/${encoded.height}.mp4"
                rows.prepare(key)
                s3.putObject(
                    PutObjectRequest.builder().bucket(properties.bucket).key(key)
                        .contentType(VIDEO_CONTENT_TYPE).cacheControl("private, no-store").overrideConfiguration {
                            it.apiCallTimeout(STORAGE_TIMEOUT)
                        }.build(),
                    RequestBody.fromFile(encoded.path),
                )
                rows.save(work, encoded.height, encoded.width, key, Files.size(encoded.path))
                Files.delete(encoded.path)
            }
        } finally {
            Files.walk(directory).use { paths ->
                paths.sorted(Comparator.reverseOrder()).forEach(Files::deleteIfExists)
            }
        }
    }
}
