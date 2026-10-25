package com.persons.id.component

import com.persons.id.exception.impl.InvalidAvatarException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.Base64
import javax.imageio.ImageIO

private const val ENCODED_384 = 384
private const val IS_EQUAL_TO_384 = 384
private const val MALFORMED_0XFF = 0xff
private const val MALFORMED_0XD8 = 0xd8
private const val OVERSIZED_300_001 = 300_001
private const val JPEG_385 = 385
private const val JPEG_384 = 384
private const val BUFFERED_IMAGE_384 = 384

class AvatarProcessorTest {
    private val processor = AvatarProcessor()

    @Test
    fun `accepts an optional avatar and reencodes a valid JPEG`() {
        assertThat(processor.decode(null)).isNull()

        val encoded = jpeg(ENCODED_384, ENCODED_384)
        val result = processor.decode(encoded)

        assertThat(result).isNotNull()

        val image = ImageIO.read(ByteArrayInputStream(result))

        assertThat(image.width).isEqualTo(IS_EQUAL_TO_384)
        assertThat(image.height).isEqualTo(IS_EQUAL_TO_384)
    }

    @Test
    fun `rejects invalid encoding with a concrete application exception`() {
        assertThatThrownBy { processor.decode("data:image/jpeg;base64,???") }
            .isInstanceOf(InvalidAvatarException::class.java)
            .hasCauseInstanceOf(IllegalArgumentException::class.java)

        assertThatThrownBy { processor.decode("data:image/png;base64,AAAA") }
            .isInstanceOf(InvalidAvatarException::class.java)
    }

    @Test
    fun `rejects malformed oversized and incorrectly sized images`() {
        val malformed = Base64.getEncoder().encodeToString(
            byteArrayOf(MALFORMED_0XFF.toByte(), MALFORMED_0XD8.toByte(), MALFORMED_0XFF.toByte()),
        )

        assertThatThrownBy { processor.decode("data:image/jpeg;base64,$malformed") }
            .isInstanceOf(InvalidAvatarException::class.java)

        val oversized = Base64.getEncoder().encodeToString(ByteArray(OVERSIZED_300_001))

        assertThatThrownBy { processor.decode("data:image/jpeg;base64,$oversized") }
            .isInstanceOf(InvalidAvatarException::class.java)

        assertThatThrownBy { processor.decode(jpeg(JPEG_385, JPEG_384)) }
            .isInstanceOf(InvalidAvatarException::class.java)
    }

    @Test
    fun `rejects a PNG disguised as a JPEG`() {
        val output = ByteArrayOutputStream()

        ImageIO.write(BufferedImage(BUFFERED_IMAGE_384, BUFFERED_IMAGE_384, BufferedImage.TYPE_INT_RGB), "png", output)

        val encoded = "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(output.toByteArray())

        assertThatThrownBy { processor.decode(encoded) }
            .isInstanceOf(InvalidAvatarException::class.java)
    }

    private fun jpeg(width: Int, height: Int): String {
        val output = ByteArrayOutputStream()

        ImageIO.write(BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), "jpeg", output)

        return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(output.toByteArray())
    }
}
