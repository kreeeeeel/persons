package com.persons.person.dao.repository

import com.persons.person.dao.entity.ProfileViewEntity
import com.persons.person.dao.specification.matching
import jakarta.persistence.EntityManager
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.time.LocalDate
import java.util.UUID

private const val PERSON_ID = "personId"
private const val VISITOR_HASH = "visitorHash"
private const val VIEW_DATE = "viewDate"

@Repository
class ProfileViewRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<ProfileViewEntity, UUID>(ProfileViewEntity::class.java, entityManager) {
    fun seen(personId: UUID, hash: String, day: LocalDate): Boolean = exists(
        matching(
            PERSON_ID to personId,
            VISITOR_HASH to hash, VIEW_DATE to day,
        ),
    )
    fun total(personId: UUID): Long = count(matching(PERSON_ID to personId))
}
