package com.persons.personworker

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.personworker.component.VideoEncoder
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.TimeUnit

@EnabledIfEnvironmentVariable(named = "VIDEO_ENCODER_TESTS", matches = "true")
class VideoEncoderMovTest {
    @TempDir lateinit var directory: Path
    private val encoder = VideoEncoder(ObjectMapper())

    @Test
    fun `converts a real ProRes QuickTime with PCM sound into a playable small MP4 and JPEG preview`() {
        val input = directory.resolve("clip.mov")
        val process = ProcessBuilder(
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=320x240:rate=12",
            "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100", "-t", "1", "-c:v", "prores_ks",
            "-profile:v", "0", "-c:a", "pcm_s16le", "-y", input.toString(),
        ).redirectErrorStream(true).redirectOutput(directory.resolve("fixture.log").toFile()).start()
        assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue()
        assertThat(process.exitValue()).isZero()
        val dimensions = encoder.dimensions(input)
        assertThat(dimensions.height).isEqualTo(240)
        assertThat(dimensions.duration).isBetween(0.9, 1.1)
        assertThat(encoder.heights(dimensions)).containsExactly(240)
        val output = encoder.encode(input, 240)
        assertThat(encoder.dimensions(output.path).height).isEqualTo(240)
        assertThat(Files.size(output.path)).isPositive()
        val preview = encoder.preview(input, dimensions)
        assertThat(Files.readAllBytes(preview).take(2)).containsExactly(0xFF.toByte(), 0xD8.toByte())
        val probe = ProcessBuilder(
            "ffprobe", "-v", "error", "-show_entries", "stream=codec_name,pix_fmt", "-of", "json",
            output.path.toString(),
        )
            .redirectErrorStream(true).redirectOutput(directory.resolve("codecs.json").toFile()).start()
        assertThat(probe.waitFor(10, TimeUnit.SECONDS)).isTrue()
        val codecs = Files.readString(directory.resolve("codecs.json"))
        assertThat(codecs).contains("h264", "aac", "yuv420p").doesNotContain("prores", "pcm_s16le")
    }
}
