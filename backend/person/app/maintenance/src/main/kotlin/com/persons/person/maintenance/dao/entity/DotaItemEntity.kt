package com.persons.person.maintenance.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.IdClass
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "person_dota_items")
@IdClass(DotaItemId::class)
class DotaItemEntity(
    @Id var personId: UUID = UUID.randomUUID(),
    @Id var matchId: Long = 0,
    @Id var slot: Int = 0,
    var itemKey: String = "",
    var itemName: String = "",
    var acquiredAtSeconds: Int? = null,
)
