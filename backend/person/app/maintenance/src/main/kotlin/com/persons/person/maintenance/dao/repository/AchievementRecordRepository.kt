package com.persons.person.maintenance.dao.repository

import com.persons.person.dao.entity.AchievementEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface AchievementRecordRepository :
    JpaRepository<AchievementEntity, UUID>,
    JpaSpecificationExecutor<AchievementEntity>
