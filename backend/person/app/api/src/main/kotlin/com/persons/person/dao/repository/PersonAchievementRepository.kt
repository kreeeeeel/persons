package com.persons.person.dao.repository

import com.persons.person.dao.entity.PersonAchievementEntity
import com.persons.person.dao.specification.matching
import jakarta.persistence.EntityManager
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

private const val PERSON_ID = "personId"
private const val ACHIEVEMENT_ID = "achievementId"
private const val PERSON_IDS = "personIds"
private const val PAGE_QUERY = """
    select g from PersonAchievementEntity g, AchievementEntity a
    where g.personId = :personId and g.achievementId = a.id and a.active = true order by g.assignedAt desc
"""
private const val COUNT_QUERY = """
    select count(g) from PersonAchievementEntity g, AchievementEntity a
    where g.personId = :personId and g.achievementId = a.id and a.active = true
"""
private const val EXISTING_QUERY = """
    select g.personId from PersonAchievementEntity g where g.achievementId = :achievementId and g.personId in :personIds
"""

@Repository
class PersonAchievementRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<PersonAchievementEntity, UUID>(PersonAchievementEntity::class.java, entityManager) {
    fun byPersonAndAchievement(personId: UUID, achievementId: UUID): PersonAchievementEntity? =
        findOne(matching(PERSON_ID to personId, ACHIEVEMENT_ID to achievementId)).orElse(null)

    fun page(personId: UUID, pageable: Pageable): Page<PersonAchievementEntity> {
        val rows = entityManager.createQuery(PAGE_QUERY, PersonAchievementEntity::class.java)
            .setParameter(PERSON_ID, personId).setFirstResult(pageable.offset.toInt())
            .setMaxResults(pageable.pageSize).resultList
        val total = entityManager.createQuery(COUNT_QUERY, java.lang.Long::class.java)
            .setParameter(PERSON_ID, personId).singleResult.toLong()
        return PageImpl(rows, pageable, total)
    }

    fun existing(achievementId: UUID, personIds: List<UUID>): Set<UUID> = entityManager.createQuery(
        EXISTING_QUERY, UUID::class.java,
    ).setParameter(ACHIEVEMENT_ID, achievementId).setParameter(PERSON_IDS, personIds).resultList.toSet()
}
