package com.persons.person.component

import com.persons.person.domain.MediaKind
import org.springframework.stereotype.Component
import java.util.UUID

private const val ACHIEVEMENTS = "achievments"
private const val VIDEO = "video"
private const val PHOTO = "photo"
private const val AVATARS = "avatars/persons"
private const val PROOFS = "proofs"

@Component
class MediaObjectKeys {
    fun media(kind: MediaKind, personId: UUID, mediaId: UUID): String {
        val prefix = when (kind) {
            MediaKind.MOMENT -> VIDEO
            MediaKind.PHOTO -> PHOTO
            MediaKind.AVATAR -> AVATARS
            MediaKind.PROOF -> PROOFS
        }

        return "$prefix/$personId/$mediaId/original"
    }

    fun preview(personId: UUID, mediaId: UUID): String = "$VIDEO/$personId/$mediaId/preview"

    fun achievement(id: UUID): String = "$ACHIEVEMENTS/$id"
}
