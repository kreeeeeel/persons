package com.persons.person.domain

import java.util.UUID

data class MediaEditReview(
    val caption: String,
    val taggedPersonIds: List<UUID>,
    val taggedNames: List<String> = emptyList(),
)
