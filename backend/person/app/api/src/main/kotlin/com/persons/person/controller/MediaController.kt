package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.component.ByteRangeParser
import com.persons.person.component.MediaUploadComponent
import com.persons.person.component.PersonMediaStore
import com.persons.person.contract.api.MediaApi
import com.persons.person.contract.dto.MediaKind
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.service.MediaService
import org.springframework.core.io.Resource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@RestController
class MediaController(
    private val actors: ActorResolver,
    private val uploads: MediaUploadComponent,
    private val media: MediaService,
    private val ranges: ByteRangeParser,
    private val store: PersonMediaStore,
) : MediaApi {
    override fun uploadMedia(
        id: UUID,
        file: MultipartFile,
        kind: MediaKind,
        caption: String?,
        durationSeconds: Double?,
        preview: MultipartFile?,
        taggedPersonIds: List<UUID>?,
    ): ResponseEntity<ModerationReceipt> = ResponseEntity.accepted().body(
        uploads.upload(
            id, com.persons.person.domain.MediaKind.valueOf(kind.name), caption.orEmpty(), file,
            durationSeconds ?: 0.0, preview, taggedPersonIds.orEmpty(),
        ),
    )

    override fun deleteMedia(id: UUID): ResponseEntity<ModerationReceipt> =
        ResponseEntity.accepted().body(media.proposeRemoval(id, actors.required()))

    override fun readMedia(id: UUID, range: String?): ResponseEntity<Resource> {
        val file = media.readable(id, actors.optional())
        val window = ranges.parse(range, file.sizeBytes)
        val headers = HttpHeaders()
        headers.contentType = MediaType.parseMediaType(file.contentType)
        headers.contentLength = window?.length ?: file.sizeBytes
        headers.set(HttpHeaders.ACCEPT_RANGES, "bytes")
        headers.set(HttpHeaders.CACHE_CONTROL, "private, no-store")
        val extension = when (file.contentType) {
            "image/jpeg" -> "jpg"
            "image/png" -> "png"
            "image/webp" -> "webp"
            "video/mp4" -> "mp4"
            "video/webm" -> "webm"
            "video/quicktime" -> "mov"
            else -> "bin"
        }
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"$id.$extension\"")
        headers.set("X-Content-Type-Options", "nosniff")

        if (window != null) {
            headers.set(HttpHeaders.CONTENT_RANGE, "bytes ${window.start}-${window.end}/${file.sizeBytes}")
        }

        return ResponseEntity.status(if (window == null) HttpStatus.OK else HttpStatus.PARTIAL_CONTENT)
            .headers(headers).body(store.read(file.objectKey, window))
    }
}
