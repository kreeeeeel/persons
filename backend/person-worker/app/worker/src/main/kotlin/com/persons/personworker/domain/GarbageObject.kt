package com.persons.personworker.domain

import java.util.UUID

data class GarbageObject(val id: UUID, val key: String, val previewKey: String? = null)
