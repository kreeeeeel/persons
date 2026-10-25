package com.persons.person.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "storage_garbage")
class StorageGarbageEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var objectKey: String = "",
    var createdAt: Instant = Instant.now(),
    var retiredAt: Instant? = null,
)
