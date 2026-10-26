package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.component.PersonMediaStore
import com.persons.person.contract.api.GalleryApi
import com.persons.person.contract.dto.GalleryPage
import com.persons.person.contract.dto.MediaDetail
import com.persons.person.contract.dto.MediaEditInput
import com.persons.person.contract.dto.MediaReactionInput
import com.persons.person.contract.dto.MediaReactionState
import com.persons.person.contract.dto.MediaViewState
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.ViewInput
import com.persons.person.domain.ReactionKind
import com.persons.person.exception.impl.NotFoundException
import com.persons.person.service.GalleryService
import com.persons.person.service.MediaReactionService
import com.persons.person.service.MediaService
import com.persons.person.service.MediaViewService
import org.springframework.core.io.Resource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class GalleryController(
    private val actors: ActorResolver,
    private val gallery: GalleryService,
    private val reactions: MediaReactionService,
    private val media: MediaService,
    private val store: PersonMediaStore,
    private val views: MediaViewService,
) : GalleryApi {
    override fun listGallery(id: UUID, page: Int, size: Int): ResponseEntity<GalleryPage> =
        ResponseEntity.ok(gallery.page(id, page, size, actors.optional()))

    override fun recordMediaView(id: UUID, viewInput: ViewInput): ResponseEntity<MediaViewState> =
        ResponseEntity.ok(views.record(id, viewInput.visitorId, actors.optional()))
    override fun getMediaDetail(id: UUID, mixed: Boolean): ResponseEntity<MediaDetail> =
        ResponseEntity.ok(gallery.detail(id, actors.optional(), mixed))

    override fun editMedia(id: UUID, mediaEditInput: MediaEditInput): ResponseEntity<ModerationReceipt> =
        ResponseEntity.accepted().body(gallery.proposeEdit(id, mediaEditInput, actors.required()))

    override fun reactToMedia(id: UUID, mediaReactionInput: MediaReactionInput): ResponseEntity<MediaReactionState> =
        ResponseEntity.ok(
            reactions.react(
                id,
                ReactionKind.valueOf(mediaReactionInput.reaction.name),
                actors.required(),
            ),
        )

    override fun removeMediaReaction(id: UUID): ResponseEntity<MediaReactionState> =
        ResponseEntity.ok(reactions.react(id, null, actors.required()))

    override fun readMediaPreview(id: UUID): ResponseEntity<Resource> {
        val row = media.readable(id, actors.optional())
        val key = row.previewObjectKey ?: throw NotFoundException()
        return ResponseEntity.ok().contentType(
            MediaType.parseMediaType(
                row.previewContentType ?: throw NotFoundException(),
            ),
        )
            .contentLength(row.previewSize ?: throw NotFoundException()).header(
                HttpHeaders.CACHE_CONTROL,
                "private, no-store",
            )
            .header("X-Content-Type-Options", "nosniff").body(store.read(key, null))
    }
}
