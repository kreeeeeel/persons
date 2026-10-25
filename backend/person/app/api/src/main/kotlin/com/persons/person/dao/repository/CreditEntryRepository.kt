package com.persons.person.dao.repository

import com.persons.person.dao.entity.CreditEntryEntity
import com.persons.person.dao.specification.matching
import com.persons.person.dao.specification.orderContentFeed
import com.persons.person.domain.ContentKind
import com.persons.person.domain.FeedOrder
import jakarta.persistence.EntityManager
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

private const val PERSON_ID = "personId"
private const val DELETED = "deleted"

@Repository
class CreditEntryRepository(entityManager: EntityManager) :
    SimpleJpaRepository<CreditEntryEntity, UUID>(CreditEntryEntity::class.java, entityManager) {
    fun page(
        personId: UUID,
        pageable: Pageable,
        authorId: UUID? = null,
        order: FeedOrder = FeedOrder.NEWEST,
        mine: Boolean = false,
    ): Page<CreditEntryEntity> = findAll(
        matching<CreditEntryEntity>(PERSON_ID to personId, DELETED to false).and(
            Specification { row, _, builder ->
                if (mine) {
                    builder.equal(row.get<UUID>("authorId"), authorId)
                } else if (authorId == null) {
                    builder.isTrue(row.get("published"))
                } else {
                    builder.or(
                        builder.isTrue(row.get("published")), builder.equal(row.get<UUID>("authorId"), authorId),
                    )
                }
            },
        ).and(orderContentFeed(order, ContentKind.LOAN)),
        pageable,
    )
}
