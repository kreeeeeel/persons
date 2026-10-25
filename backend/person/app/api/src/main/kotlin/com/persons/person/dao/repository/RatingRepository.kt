package com.persons.person.dao.repository

import com.persons.person.dao.entity.RatingEntity
import com.persons.person.dao.specification.matching
import com.persons.person.dao.specification.orderContentFeed
import com.persons.person.domain.ContentKind
import com.persons.person.domain.FeedOrder
import jakarta.persistence.EntityManager
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID
import java.util.stream.Collectors

private const val PERSON_ID = "personId"
private const val USER_ID = "userId"
private const val COUNTS_QUERY = """
    select r.optionId, count(r) from RatingEntity r
    where r.personId = :personId and r.optionId is not null group by r.optionId
"""

@Repository
class RatingRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<RatingEntity, UUID>(RatingEntity::class.java, entityManager) {
    fun byUser(personId: UUID, userId: UUID): RatingEntity? =
        findOne(matching(PERSON_ID to personId, USER_ID to userId)).orElse(null)
    fun page(personId: UUID, pageable: Pageable, order: FeedOrder = FeedOrder.NEWEST): Page<RatingEntity> = findAll(
        matching<RatingEntity>(PERSON_ID to personId).and(orderContentFeed(order, ContentKind.RATING)), pageable,
    )
    fun counts(personId: UUID): Map<UUID, Long> = entityManager.createQuery(COUNTS_QUERY, Array<Any>::class.java)
        .setParameter(PERSON_ID, personId).resultList.stream()
        .collect(Collectors.toMap({ it[0] as UUID }, { it[1] as Long }))
}
