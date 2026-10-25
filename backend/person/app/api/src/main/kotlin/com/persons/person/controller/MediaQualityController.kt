package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.component.ByteRangeParser
import com.persons.person.component.PersonMediaStore
import com.persons.person.contract.api.MediaQualityApi
import com.persons.person.contract.dto.MediaQuality
import com.persons.person.contract.dto.MediaQualityList
import com.persons.person.domain.MediaKind
import com.persons.person.exception.impl.NotFoundException
import com.persons.person.service.MediaQualityDao
import com.persons.person.service.MediaService
import org.springframework.core.io.Resource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

private const val PRIVATE_MEDIA = "private, no-store"

@RestController
class MediaQualityController(
    private val actors: ActorResolver,
    private val media: MediaService,
    private val qualities: MediaQualityDao,
    private val ranges: ByteRangeParser,
    private val store: PersonMediaStore,
) : MediaQualityApi {
    override fun listMediaQualities(id: UUID): ResponseEntity<MediaQualityList> {
        ensureVideo(id)
        return ResponseEntity.ok(
            MediaQualityList(
                qualities.files(id).stream().map {
                    MediaQuality(it.height, it.width, it.size)
                }.toList(),
                qualities.processing(id),
            ),
        )
    }

    override fun readMediaQuality(id: UUID, height: Int, range: String?): ResponseEntity<Resource> {
        ensureVideo(id)
        val file = qualities.files(id).firstOrNull { it.height == height } ?: throw NotFoundException()
        val window = ranges.parse(range, file.size)
        val headers = HttpHeaders()
        headers.contentType = MediaType.parseMediaType("video/mp4")
        headers.contentLength = window?.length ?: file.size
        headers.set(HttpHeaders.ACCEPT_RANGES, "bytes")
        headers.set(HttpHeaders.CACHE_CONTROL, PRIVATE_MEDIA)
        headers.set("X-Content-Type-Options", "nosniff")
        if (window != null) {
            headers.set(HttpHeaders.CONTENT_RANGE, "bytes ${window.start}-${window.end}/${file.size}")
        }
        val status = if (window == null) HttpStatus.OK else HttpStatus.PARTIAL_CONTENT
        return ResponseEntity.status(status).headers(headers).body(store.read(file.key, window))
    }

    private fun ensureVideo(id: UUID) {
        if (media.readable(id, actors.optional()).kind != MediaKind.MOMENT) {
            throw NotFoundException()
        }
    }
}
