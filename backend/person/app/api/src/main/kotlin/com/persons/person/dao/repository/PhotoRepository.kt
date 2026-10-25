package com.persons.person.dao.repository

import com.persons.person.dao.entity.PhotoEntity
import com.persons.person.dao.specification.matching
import jakarta.persistence.EntityManager
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

private const val PERSON_ID = "personId"
private const val DELETED = "deleted"

@Repository
class PhotoRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<PhotoEntity, UUID>(PhotoEntity::class.java, entityManager) {
    fun page(personId: UUID, pageable: Pageable): Page<PhotoEntity> = findAll(
        matching(
            PERSON_ID to personId,
            DELETED to false,
        ),
        pageable,
    )
    fun total(personId: UUID): Long = count(matching(PERSON_ID to personId, DELETED to false))
}
