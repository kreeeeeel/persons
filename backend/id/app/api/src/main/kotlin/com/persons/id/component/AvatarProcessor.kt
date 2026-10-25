package com.persons.id.component

import com.persons.id.exception.impl.InvalidAvatarException
import org.springframework.stereotype.Component
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.util.Base64
import javax.imageio.ImageIO

private const val MIN_JPEG_HEADER_BYTES = 3
private const val JPEG_FIRST_BYTE_INDEX = 0
private const val JPEG_FIRST_MAGIC_BYTE = 0xff
private const val JPEG_SECOND_BYTE_INDEX = 1
private const val JPEG_SECOND_MAGIC_BYTE = 0xd8
private const val FIRST_IMAGE_INDEX = 0

private const val AVATAR_DATA_PREFIX = "data:image/jpeg;base64,"
private const val MAX_AVATAR_BYTES = 300_000
private const val MAX_BASE64_LENGTH = 400_000
private const val AVATAR_SIZE = 384

@Component
class AvatarProcessor {
    fun decode(value: String?): ByteArray? {
        if (value == null) {
            return null
        }
        if (!value.startsWith(AVATAR_DATA_PREFIX) || value.length > AVATAR_DATA_PREFIX.length + MAX_BASE64_LENGTH) {
            throw InvalidAvatarException()
        }

        val bytes = try {
            Base64.getDecoder().decode(value.substring(AVATAR_DATA_PREFIX.length))
        } catch (exception: IllegalArgumentException) {
            throw InvalidAvatarException(exception)
        }

        if (bytes.size > MAX_AVATAR_BYTES ||
            bytes.size < MIN_JPEG_HEADER_BYTES ||
            bytes[JPEG_FIRST_BYTE_INDEX] != JPEG_FIRST_MAGIC_BYTE.toByte() ||
            bytes[JPEG_SECOND_BYTE_INDEX] != JPEG_SECOND_MAGIC_BYTE.toByte()
        ) {
            throw InvalidAvatarException()
        }

        try {
            ImageIO.createImageInputStream(ByteArrayInputStream(bytes)).use { input ->
                if (input == null) {
                    throw InvalidAvatarException()
                }

                val readers = ImageIO.getImageReaders(input)

                if (!readers.hasNext()) {
                    throw InvalidAvatarException()
                }

                val reader = readers.next()

                try {
                    reader.input = input

                    if (reader.formatName.lowercase() != "jpeg" ||
                        reader.getWidth(FIRST_IMAGE_INDEX) != AVATAR_SIZE ||
                        reader.getHeight(FIRST_IMAGE_INDEX) != AVATAR_SIZE
                    ) {
                        throw InvalidAvatarException()
                    }

                    val output = ByteArrayOutputStream()

                    if (!ImageIO.write(reader.read(FIRST_IMAGE_INDEX), "jpeg", output) ||
                        output.size() > MAX_AVATAR_BYTES
                    ) {
                        throw InvalidAvatarException()
                    }

                    return output.toByteArray()
                } finally {
                    reader.dispose()
                }
            }
        } catch (exception: IOException) {
            throw InvalidAvatarException(exception)
        }
    }
}
