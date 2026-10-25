package com.persons.person.maintenance.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.IdClass
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "person_dota_neutral_items")
@IdClass(DotaMatchId::class)
class DotaNeutralItemEntity(
    @Id var personId: UUID = UUID.randomUUID(),
    @Id var matchId: Long = 0,
    var itemKey: String = "",
    var itemName: String = "",
    var acquiredAtSeconds: Int? = null,
)
