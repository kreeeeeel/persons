package com.persons.person.dao.entity

import com.persons.person.domain.AchievementType
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "achievements")
class AchievementEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var title: String = "",
    var description: String = "",
    var imageObjectKey: String = "",
    var imageContentType: String = "",
    var imageSize: Long = 0,
    var active: Boolean = true,
    var deleted: Boolean = false,
    var createdAt: Instant = Instant.now(),
    @Enumerated(EnumType.STRING) var type: AchievementType = AchievementType.MANUAL,
    var pageAgeYears: Int? = null,
    @Version var version: Long? = null,
)
