package com.persons.person.dao.repository

import com.persons.person.dao.entity.TagEntity
import com.persons.person.dao.specification.matching
import jakarta.persistence.EntityManager
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

private const val PERSON_ID = "personId"
private const val POSITION = "position"

@Repository
class TagRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<TagEntity, UUID>(TagEntity::class.java, entityManager) {
    fun byPerson(id: UUID): List<TagEntity> = findAll(matching(PERSON_ID to id), Sort.by(POSITION))
}
