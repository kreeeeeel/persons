package com.persons.person.component

import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.domain.MediaKind
import com.persons.person.service.MediaService
import com.persons.person.service.MediaTagService
import org.springframework.stereotype.Component
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@Component
class MediaUploadComponent(
    private val actors: ActorResolver,
    private val policy: MediaPolicy,
    private val media: MediaService,
    private val store: PersonMediaStore,
    private val tags: MediaTagService,
) {
    fun upload(
        personId: UUID,
        kind: MediaKind,
        caption: String,
        file: MultipartFile,
        duration: Double = 0.0,
        preview: MultipartFile? = null,
        taggedIds: List<UUID> = emptyList(),
    ): ModerationReceipt {
        val actor = actors.required()
        tags.validate(taggedIds)
        val upload = policy.validate(file, kind)
        val thumbnail = preview?.let { policy.validate(it, MediaKind.PHOTO) }
        val row = media.reserve(personId, kind, caption, upload, actor, duration, thumbnail)
        store.put(row.objectKey, row.contentType, row.sizeBytes, file::getInputStream)
        val previewKey = row.previewObjectKey
        if (preview != null && previewKey != null && thumbnail != null) {
            store.put(previewKey, thumbnail.contentType, thumbnail.size, preview::getInputStream)
        }

        return media.complete(row.id, actor, taggedIds)
    }
}
