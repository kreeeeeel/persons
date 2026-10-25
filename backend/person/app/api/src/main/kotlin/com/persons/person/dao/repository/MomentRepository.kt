package com.persons.person.dao.repository

import com.persons.person.dao.entity.MomentEntity
import com.persons.person.dao.specification.matching
import jakarta.persistence.EntityManager
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

private const val PERSON_ID = "personId"
private const val DELETED = "deleted"
private const val PERSON_QUERY = "select m.personId from MomentEntity m where m.id = :id"

@Repository
class MomentRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<MomentEntity, UUID>(MomentEntity::class.java, entityManager) {
    fun page(personId: UUID, pageable: Pageable): Page<MomentEntity> = findAll(
        matching(
            PERSON_ID to personId,
            DELETED to false,
        ),
        pageable,
    )
    fun total(personId: UUID): Long = count(matching(PERSON_ID to personId, DELETED to false))
    fun personId(id: UUID): UUID? = entityManager.createQuery(PERSON_QUERY, UUID::class.java)
        .setParameter("id", id).resultList.firstOrNull()
}
