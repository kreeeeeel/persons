package com.persons.person.domain

import java.util.UUID

data class AuthorProfile(
    val id: UUID,
    val authorName: String,
    val authorTag: String? = null,
    val authorAvatarMediaId: UUID? = null,
    val authorAvatarUrl: String? = null,
)
