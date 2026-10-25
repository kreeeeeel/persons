package com.persons.person.dao.repository

import com.persons.person.dao.entity.PageRestrictionEntity
import com.persons.person.dao.specification.matching
import jakarta.persistence.EntityManager
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

@Repository
class PageRestrictionRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<PageRestrictionEntity, UUID>(PageRestrictionEntity::class.java, entityManager) {
    fun active(now: Instant, query: String, userId: UUID?, pageable: Pageable): Page<PageRestrictionEntity> = findAll(
        Specification { row, _, builder ->
            val text = "%${query.trim().lowercase().replace("!", "!!").replace("%", "!%")
                .replace("_", "!_")}%"
            builder.and(
                builder.isFalse(row.get("revoked")),
                builder.or(
                    builder.isNull(row.get<Instant>("expiresAt")),
                    builder.greaterThan(row.get("expiresAt"), now),
                ),
                builder.like(builder.lower(row.get("reason")), text, '!'),
                if (userId == null) builder.conjunction() else builder.equal(row.get<UUID>("userId"), userId),
            )
        },
        pageable,
    )

    fun personId(id: UUID): UUID? = entityManager.createQuery(
        "select r.personId from PageRestrictionEntity r where r.id = :id", UUID::class.java,
    ).setParameter("id", id).resultList.firstOrNull()

    fun byUser(userId: UUID): List<PageRestrictionEntity> =
        findAll(matching("userId" to userId, "revoked" to false), Sort.by(Sort.Direction.DESC, "createdAt"))

    fun forPage(userId: UUID, personId: UUID): PageRestrictionEntity? =
        findAll(matching("userId" to userId, "personId" to personId)).firstOrNull()
}
