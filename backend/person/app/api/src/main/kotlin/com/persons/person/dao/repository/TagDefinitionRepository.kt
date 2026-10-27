package com.persons.person.dao.repository

import com.persons.person.dao.entity.TagDefinitionEntity
import jakarta.persistence.EntityManager
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository

@Repository
class TagDefinitionRepository(entityManager: EntityManager) :
    SimpleJpaRepository<TagDefinitionEntity, String>(TagDefinitionEntity::class.java, entityManager)
