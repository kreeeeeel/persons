package com.persons.person.domain

import java.util.UUID

data class MediaReview(
    val mediaId: UUID,
    val kind: MediaKind,
    val caption: String,
    val contentType: String,
    val taggedPersonIds: List<UUID> = emptyList(),
    val taggedNames: List<String> = emptyList(),
)
