package com.persons.person.dao.repository

import com.persons.person.dao.entity.SocialLinkEntity
import com.persons.person.dao.specification.matching
import jakarta.persistence.EntityManager
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

private const val PERSON_ID = "personId"

@Repository
class SocialLinkRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<SocialLinkEntity, UUID>(SocialLinkEntity::class.java, entityManager) {
    fun byPerson(id: UUID): List<SocialLinkEntity> = findAll(matching(PERSON_ID to id))
}
