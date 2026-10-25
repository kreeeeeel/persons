package com.persons.person.component

import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.domain.MediaKind
import com.persons.person.service.MediaService
import com.persons.person.service.OwnershipService
import org.springframework.stereotype.Component
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@Component
class OwnershipClaimComponent(
    private val actors: ActorResolver,
    private val ownership: OwnershipService,
    private val policy: MediaPolicy,
    private val media: MediaService,
    private val store: PersonMediaStore,
) {
    fun submit(id: UUID, message: String, file: MultipartFile): ModerationReceipt {
        val actor = actors.required()
        ownership.validate(id, actor, message)
        val image = policy.validate(file, MediaKind.PROOF)
        val row = media.reserve(id, MediaKind.PROOF, "", image, actor)
        store.put(row.objectKey, image.contentType, image.size, file::getInputStream)
        return ownership.submit(id, actor, message, row.id)
    }
}
