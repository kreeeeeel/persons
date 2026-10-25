package com.persons.person.dao.repository

import com.persons.person.dao.entity.SiteSettingsEntity
import jakarta.persistence.EntityManager
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository

@Repository
class SiteSettingsRepository(entityManager: EntityManager) :
    SimpleJpaRepository<SiteSettingsEntity, Int>(SiteSettingsEntity::class.java, entityManager)
