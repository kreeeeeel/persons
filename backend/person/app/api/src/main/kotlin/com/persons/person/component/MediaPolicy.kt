package com.persons.person.component

import com.persons.person.domain.ErrorCode
import com.persons.person.domain.MediaKind
import com.persons.person.domain.VerifiedUpload
import com.persons.person.exception.impl.MediaException
import org.springframework.stereotype.Component
import org.springframework.web.multipart.MultipartFile
import java.io.IOException
import java.nio.charset.StandardCharsets
import javax.imageio.ImageIO

private const val MAX_VIDEO_BYTES = 512L * 1024 * 1024
private const val MAX_IMAGE_BYTES = 32L * 1024 * 1024
private const val MAX_PROOF_BYTES = 12L * 1024 * 1024
private const val MAX_AVATAR_BYTES = 2L * 1024 * 1024
private const val HEADER_BYTES = 16
private const val MAX_IMAGE_SIDE = 8192
private const val MAX_IMAGE_PIXELS = 40_000_000L
private const val JPEG = "image/jpeg"
private const val PNG = "image/png"
private const val MP4 = "video/mp4"
private const val WEBM = "video/webm"
private const val QUICKTIME = "video/quicktime"
private val QUICKTIME_ATOMS = setOf("wide", "moov", "mdat", "free")
private val JPEG_MAGIC = byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte())
private val PNG_MAGIC = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
private val WEBM_MAGIC = byteArrayOf(0x1A, 0x45, 0xDF.toByte(), 0xA3.toByte())

@Component
class MediaPolicy {
    fun validate(file: MultipartFile, kind: MediaKind): VerifiedUpload {
        val limit = when (kind) {
            MediaKind.MOMENT -> MAX_VIDEO_BYTES
            MediaKind.AVATAR -> MAX_AVATAR_BYTES
            MediaKind.PHOTO -> MAX_IMAGE_BYTES
            MediaKind.PROOF -> MAX_PROOF_BYTES
        }

        if (file.isEmpty) {
            throw MediaException()
        }
        if (file.size > limit) {
            throw MediaException(ErrorCode.UPLOAD_TOO_LARGE)
        }

        val header = file.inputStream.use { it.readNBytes(HEADER_BYTES) }
        val contentType = when {
            begins(header, JPEG_MAGIC) -> JPEG
            begins(header, PNG_MAGIC) -> PNG
            begins(header, WEBM_MAGIC) -> WEBM
            header.size >= HEADER_BYTES && atom(header) == "ftyp" ->
                if (String(header, 8, 4, StandardCharsets.US_ASCII) == "qt  ") QUICKTIME else MP4
            header.size >= HEADER_BYTES &&
                atom(header) in QUICKTIME_ATOMS &&
                java.nio.ByteBuffer.wrap(header, 0, 4).int.toLong() in 8..file.size -> QUICKTIME
            else -> throw MediaException()
        }
        val video = contentType == MP4 || contentType == WEBM || contentType == QUICKTIME

        if ((kind == MediaKind.MOMENT) != video) {
            throw MediaException()
        }
        if (!video) {
            try {
                validateDimensions(file)
            } catch (exception: IOException) {
                throw MediaException(cause = exception)
            }
        }

        return VerifiedUpload(contentType, file.size)
    }

    private fun validateDimensions(file: MultipartFile) {
        file.inputStream.use { source ->
            ImageIO.createImageInputStream(source).use { input ->
                val readers = ImageIO.getImageReaders(input)

                if (!readers.hasNext()) {
                    throw MediaException()
                }

                val reader = readers.next()

                try {
                    reader.input = input
                    val width = reader.getWidth(0)
                    val height = reader.getHeight(0)

                    if (width <= 0 ||
                        height <= 0 ||
                        width > MAX_IMAGE_SIDE ||
                        height > MAX_IMAGE_SIDE ||
                        width.toLong() * height > MAX_IMAGE_PIXELS
                    ) {
                        throw MediaException()
                    }
                } finally {
                    reader.dispose()
                }
            }
        }
    }

    private fun atom(header: ByteArray): String = String(header, 4, 4, StandardCharsets.US_ASCII)

    private fun begins(bytes: ByteArray, prefix: ByteArray): Boolean = bytes.size >= prefix.size &&
        java.util.stream.IntStream.range(0, prefix.size).allMatch { bytes[it] == prefix[it] }
}
