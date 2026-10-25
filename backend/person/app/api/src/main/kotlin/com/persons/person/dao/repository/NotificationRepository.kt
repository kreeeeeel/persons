package com.persons.person.dao.repository

import com.persons.person.dao.entity.NotificationEntity
import com.persons.person.dao.specification.matching
import jakarta.persistence.EntityManager
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

private const val USER_ID = "userId"
private const val READ_AT = "readAt"
private const val READ_QUERY = """
    update NotificationEntity n set n.readAt = :now where n.userId = :userId and n.readAt is null
"""

@Repository
class NotificationRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<NotificationEntity, UUID>(NotificationEntity::class.java, entityManager) {
    fun page(userId: UUID, pageable: Pageable): Page<NotificationEntity> =
        findAll(matching(USER_ID to userId), pageable)
    fun unread(userId: UUID): Long = count(matching(USER_ID to userId, READ_AT to null))
    fun markRead(userId: UUID, now: Instant) {
        entityManager.createQuery(READ_QUERY).setParameter(USER_ID, userId).setParameter("now", now).executeUpdate()
    }
}
