package com.persons.personworker.component

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.personworker.domain.EncodedVideo
import com.persons.personworker.domain.VideoDimensions
import com.persons.personworker.exception.VideoProcessingException
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path
import java.time.Duration
import java.util.concurrent.TimeUnit

private val ENCODE_TIMEOUT = Duration.ofMinutes(15)
private val PROBE_TIMEOUT = Duration.ofSeconds(30)
private const val MAXIMUM_PIXELS = 3840L * 2160L
private const val MAXIMUM_OUTPUT_BYTES = 512L * 1024L * 1024L
private const val FILE_LIMIT_TOLERANCE = 65536L
private val HEIGHTS = listOf(360, 720, 1080)
private val PROBE =
    listOf(
        "ffprobe", "-v", "error", "-protocol_whitelist", "file,pipe", "-select_streams", "v:0", "-show_entries",
        "stream=width,height:stream_side_data=rotation:stream_tags=rotate:format=duration", "-of", "json",
    )
private val ENCODE =
    listOf(
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-threads", "1", "-filter_threads", "1",
        "-protocol_whitelist", "file,pipe",
    )
private val CODECS =
    listOf(
        "-map", "0:v:0", "-map", "0:a:0?", "-map_metadata", "-1", "-c:v", "libx264", "-preset", "veryfast",
        "-pix_fmt", "yuv420p", "-crf", "28", "-threads", "1", "-c:a", "aac", "-b:a", "96k", "-ac", "2",
        "-movflags", "+faststart",
    )

@Component
class VideoEncoder(private val mapper: ObjectMapper) {
    fun dimensions(input: Path): VideoDimensions {
        val output = input.resolveSibling("probe.json")
        execute(PROBE + input.toString(), output, PROBE_TIMEOUT)
        val metadata = mapper.readTree(output.toFile())
        val stream = metadata.path("streams").path(0)
        val duration = metadata.path("format").path("duration").asDouble()
        val rotation = stream.path("side_data_list").path(0).path("rotation")
            .asInt(stream.path("tags").path("rotate").asInt())
        val rotated = kotlin.math.abs(rotation) % 180 == 90
        val width = stream.path("width").asInt()
        val height = stream.path("height").asInt()
        val dimensions = if (rotated) {
            VideoDimensions(height, width, duration)
        } else {
            VideoDimensions(width, height, duration)
        }
        if (!duration.isFinite() ||
            duration <= 0.0 ||
            duration > 86400.0 ||
            dimensions.width <= 0 ||
            dimensions.height <= 0 ||
            dimensions.width.toLong() * dimensions.height > MAXIMUM_PIXELS
        ) {
            throw VideoProcessingException("Video duration or dimensions exceed the encoding limit")
        }
        return dimensions
    }

    fun heights(dimensions: VideoDimensions): List<Int> =
        (listOf(minOf(360, dimensions.height / 2 * 2)) + HEIGHTS).stream()
            .filter { it >= 2 && it <= dimensions.height }.distinct().sorted().toList()

    fun preview(input: Path, dimensions: VideoDimensions): Path {
        val output = input.resolveSibling("preview.jpg")
        val scale = minOf(1.0, 960.0 / dimensions.width, 540.0 / dimensions.height)
        val width = maxOf(2, (dimensions.width * scale / 2).toInt() * 2)
        val height = maxOf(2, (dimensions.height * scale / 2).toInt() * 2)
        execute(
            ENCODE + listOf(
                "-i", input.toString(), "-map", "0:v:0", "-frames:v", "1", "-vf", "scale=$width:$height",
                "-q:v", "3", output.toString(),
            ),
            input.resolveSibling("preview.log"), PROBE_TIMEOUT,
        )
        if (!Files.exists(output) || Files.size(output) == 0L) throw VideoProcessingException("Video preview is empty")
        return output
    }

    fun encode(input: Path, height: Int): EncodedVideo {
        val output = input.resolveSibling("$height.mp4")
        execute(
            ENCODE + listOf("-i", input.toString(), "-vf", "scale=-2:$height", "-fs", MAXIMUM_OUTPUT_BYTES.toString()) +
                CODECS +
                output.toString(),
            input.resolveSibling("encode.log"), ENCODE_TIMEOUT,
        )
        if (!Files.exists(output) || Files.size(output) == 0L) {
            throw VideoProcessingException("Video encoder returned an empty file")
        }
        if (Files.size(output) >= MAXIMUM_OUTPUT_BYTES - FILE_LIMIT_TOLERANCE) {
            throw VideoProcessingException("Encoded video reached the file size limit")
        }
        val actual = dimensions(output)
        return EncodedVideo(actual.height, actual.width, output)
    }

    private fun execute(command: List<String>, output: Path, timeout: Duration) {
        val process = ProcessBuilder(command).redirectErrorStream(true).redirectOutput(output.toFile()).start()
        try {
            if (!process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS)) {
                throw VideoProcessingException("Video processing timed out")
            }
            if (process.exitValue() != 0) {
                throw VideoProcessingException("Video processing failed with exit code ${process.exitValue()}")
            }
        } finally {
            if (process.isAlive) {
                process.destroyForcibly()
                process.waitFor(5, TimeUnit.SECONDS)
            }
        }
    }
}
