package com.persons.person.maintenance.dao.entity

import java.io.Serializable
import java.util.UUID

data class MediaQualityId(var mediaId: UUID = UUID.randomUUID(), var height: Int = 0) : Serializable
