package com.persons.person.dao.repository

import com.persons.person.dao.entity.PublicationSettingsEntity
import jakarta.persistence.EntityManager
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository

@Repository
class PublicationSettingsRepository(entityManager: EntityManager) :
    SimpleJpaRepository<PublicationSettingsEntity, Int>(PublicationSettingsEntity::class.java, entityManager)
