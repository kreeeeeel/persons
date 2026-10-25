package com.persons.person.maintenance.dao.repository

import com.persons.person.dao.entity.PersonAchievementEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface PersonAchievementRecordRepository :
    JpaRepository<PersonAchievementEntity, UUID>,
    JpaSpecificationExecutor<PersonAchievementEntity> {
    fun existsByPersonIdAndAchievementId(personId: UUID, achievementId: UUID): Boolean
}
