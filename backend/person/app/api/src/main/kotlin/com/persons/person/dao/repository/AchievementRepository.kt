package com.persons.person.dao.repository

import com.persons.person.dao.entity.AchievementEntity
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

private const val LOCKED = "select a from AchievementEntity a where a.id = :id and a.deleted = false"

@Repository
class AchievementRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<AchievementEntity, UUID>(AchievementEntity::class.java, entityManager) {
    fun locked(id: UUID): AchievementEntity? = entityManager.createQuery(LOCKED, AchievementEntity::class.java)
        .setParameter("id", id).setLockMode(LockModeType.PESSIMISTIC_WRITE).resultList.firstOrNull()
}
