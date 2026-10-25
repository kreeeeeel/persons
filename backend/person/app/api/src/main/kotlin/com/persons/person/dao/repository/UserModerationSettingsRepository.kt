package com.persons.person.dao.repository

import com.persons.person.dao.entity.UserModerationSettingsEntity
import jakarta.persistence.EntityManager
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class UserModerationSettingsRepository(entityManager: EntityManager) :
    SimpleJpaRepository<UserModerationSettingsEntity, UUID>(UserModerationSettingsEntity::class.java, entityManager)
