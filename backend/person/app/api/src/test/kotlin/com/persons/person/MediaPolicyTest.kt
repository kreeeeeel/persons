package com.persons.person

import com.persons.person.component.MediaPolicy
import com.persons.person.domain.ErrorCode
import com.persons.person.domain.MediaKind
import com.persons.person.exception.impl.MediaException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource
import org.mockito.Mockito
import org.springframework.mock.web.MockMultipartFile
import org.springframework.web.multipart.MultipartFile
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO

class MediaPolicyTest {
    private val policy = MediaPolicy()

    @ParameterizedTest
    @CsvSource("MOMENT,536870912", "PHOTO,33554432", "AVATAR,2097152", "PROOF,12582912")
    fun `accepts the exact media size boundary without buffering the file`(kind: MediaKind, limit: Long) {
        val output = ByteArrayOutputStream()
        ImageIO.write(BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", output)
        val bytes = if (kind == MediaKind.MOMENT) {
            byteArrayOf(0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0)
        } else {
            output.toByteArray()
        }
        val file = Mockito.mock(MultipartFile::class.java)
        Mockito.`when`(file.size).thenReturn(limit)
        Mockito.`when`(file.inputStream).thenAnswer { ByteArrayInputStream(bytes) }

        assertThat(policy.validate(file, kind).size).isEqualTo(limit)
        Mockito.verify(file, Mockito.never()).bytes
    }

    @ParameterizedTest
    @CsvSource("MOMENT,536870912", "PHOTO,33554432", "AVATAR,2097152", "PROOF,12582912")
    fun `rejects files over each limit before opening a stream`(kind: MediaKind, limit: Long) {
        val file = Mockito.mock(MultipartFile::class.java)
        Mockito.`when`(file.size).thenReturn(limit + 1)

        assertThatThrownBy { policy.validate(file, kind) }.isInstanceOf(MediaException::class.java)
            .extracting("error").isEqualTo(ErrorCode.UPLOAD_TOO_LARGE)
        Mockito.verify(file, Mockito.never()).inputStream
        Mockito.verify(file, Mockito.never()).bytes
    }

    @Test
    fun `accepts modern and legacy QuickTime signatures regardless of MIME and rejects invalid atoms`() {
        val modern = byteArrayOf(0, 0, 0, 16) + "ftypqt  ".toByteArray() + byteArrayOf(0, 0, 0, 0)
        val legacy = byteArrayOf(0, 0, 0, 8) + "wide".toByteArray() + byteArrayOf(0, 0, 0, 8) + "mdat".toByteArray()
        listOf(modern, legacy).stream().forEach { bytes ->
            val file = MockMultipartFile("file", "CLIP.MOV", "application/octet-stream", bytes)
            assertThat(policy.validate(file, MediaKind.MOMENT).contentType).isEqualTo("video/quicktime")
            assertThatThrownBy { policy.validate(file, MediaKind.PHOTO) }.isInstanceOf(MediaException::class.java)
        }
        val invalid = byteArrayOf(0, 0, 1, 0) + "moov".toByteArray() + byteArrayOf(0, 0, 0, 0, 0, 0, 0, 0)
        assertThatThrownBy { policy.validate(MockMultipartFile("file", invalid), MediaKind.MOMENT) }
            .isInstanceOf(MediaException::class.java)
        assertThatThrownBy {
            policy.validate(
                MockMultipartFile("file", "bad.mov", "video/quicktime", "not a video".toByteArray()), MediaKind.MOMENT,
            )
        }
            .isInstanceOf(MediaException::class.java)
    }

    @Test
    fun `detects image content independently from the claimed type`() {
        val output = ByteArrayOutputStream()
        ImageIO.write(BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", output)
        val upload = policy.validate(
            MockMultipartFile(
                "file",
                "photo.exe",
                "application/octet-stream",
                output.toByteArray(),
            ),
            MediaKind.PHOTO,
        )
        assertThat(upload.contentType).isEqualTo("image/png")
        assertThatThrownBy { policy.validate(MockMultipartFile("file", output.toByteArray()), MediaKind.MOMENT) }
            .isInstanceOf(MediaException::class.java)
    }

    @Test
    fun `rejects oversized avatars before reading their contents and rejects disguised html`() {
        val file = Mockito.mock(MultipartFile::class.java)
        Mockito.`when`(file.size).thenReturn(3L * 1024 * 1024)
        assertThatThrownBy { policy.validate(file, MediaKind.AVATAR) }.isInstanceOf(MediaException::class.java)
        Mockito.verify(file, Mockito.never()).inputStream
        assertThatThrownBy {
            policy.validate(
                MockMultipartFile(
                    "file",
                    "photo.png",
                    "image/png",
                    "<script>alert(1)</script>".toByteArray(),
                ),
                MediaKind.PHOTO,
            )
        }
            .isInstanceOf(MediaException::class.java)
    }
}
