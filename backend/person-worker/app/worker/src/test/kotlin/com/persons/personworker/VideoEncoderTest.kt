package com.persons.personworker

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.personworker.component.VideoEncoder
import com.persons.personworker.domain.VideoDimensions
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class VideoEncoderTest {
    private val encoder = VideoEncoder(ObjectMapper())

    @Test
    fun `always prepares a compatible rendition without upscaling originals`() {
        assertThat(encoder.heights(VideoDimensions(320, 240))).containsExactly(240)
        assertThat(encoder.heights(VideoDimensions(640, 360))).containsExactly(360)
        assertThat(encoder.heights(VideoDimensions(1280, 720))).containsExactly(360, 720)
        assertThat(encoder.heights(VideoDimensions(1920, 1080))).containsExactly(360, 720, 1080)
        assertThat(encoder.heights(VideoDimensions(3840, 2160))).containsExactly(360, 720, 1080)
    }
}
