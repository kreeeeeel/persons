package com.persons.personworker.dao

import com.persons.person.dao.entity.CreditEntryEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.RatingEntity
import com.persons.person.domain.CreditKind
import com.persons.person.maintenance.AggregateReputation
import com.persons.person.maintenance.dao.entity.PersonAggregateEntity
import com.persons.person.maintenance.dao.entity.RatingOptionTotalEntity
import com.persons.person.maintenance.dao.repository.AggregateQueueRepository
import com.persons.person.maintenance.dao.repository.PersonAggregateRepository
import com.persons.person.maintenance.dao.repository.RatingOptionTotalRepository
import com.persons.personworker.domain.AggregateInput
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class AggregateRepository(
    private val entityManager: EntityManager,
    private val queue: AggregateQueueRepository,
    private val aggregates: PersonAggregateRepository,
    private val options: RatingOptionTotalRepository,
) {
    fun candidates(limit: Int): List<UUID> = queue.findAll(PageRequest.of(0, limit, Sort.by("requestedAt", "personId")))
        .content.stream().map { it.personId }.toList()

    fun claim(id: UUID): Boolean = entityManager.find(
        PersonEntity::class.java,
        id,
        LockModeType.PESSIMISTIC_WRITE,
        mapOf("jakarta.persistence.lock.timeout" to -2),
    ) != null &&
        queue.existsById(id)

    fun input(id: UUID): AggregateInput {
        val builder = entityManager.criteriaBuilder
        val ratingsQuery = builder.createTupleQuery()
        val rating = ratingsQuery.from(RatingEntity::class.java)
        ratingsQuery.multiselect(builder.count(rating), builder.coalesce(builder.avg(rating.get("value")), 0.0))
            .where(builder.equal(rating.get<UUID>("personId"), id))
        val ratings = entityManager.createQuery(ratingsQuery).singleResult
        val loansQuery = builder.createTupleQuery()
        val loan = loansQuery.from(CreditEntryEntity::class.java)
        val value = builder.selectCase<Double>()
            .`when`(loan.get<CreditKind>("kind").`in`(CreditKind.TRUST, CreditKind.ON_TIME), 100.0)
            .`when`(builder.equal(loan.get<CreditKind>("kind"), CreditKind.SHORT_DELAY), 65.0)
            .`when`(builder.equal(loan.get<CreditKind>("kind"), CreditKind.LONG_DELAY), 25.0).otherwise(0.0)
        val score = builder.selectCase<Long>()
            .`when`(loan.get<CreditKind>("kind").`in`(CreditKind.TRUST, CreditKind.ON_TIME), 1L)
            .`when`(builder.equal(loan.get<CreditKind>("kind"), CreditKind.SHORT_DELAY), 0L).otherwise(-1L)
        loansQuery.multiselect(
            builder.count(loan), builder.coalesce(builder.avg(value), 0.0),
            builder.coalesce(builder.sum(score), 0L),
        ).where(
            builder.equal(loan.get<UUID>("personId"), id),
            builder.isTrue(loan.get("published")), builder.isFalse(loan.get("deleted")),
        )
        val loans = entityManager.createQuery(loansQuery).singleResult
        return AggregateInput(
            ratings.get(0, Long::class.javaObjectType), ratings.get(1, Double::class.javaObjectType),
            loans.get(0, Long::class.javaObjectType), loans.get(1, Double::class.javaObjectType),
            loans.get(2, Long::class.javaObjectType),
        )
    }

    fun save(id: UUID, input: AggregateInput, reputation: AggregateReputation, now: Instant) {
        aggregates.save(
            PersonAggregateEntity(
                id, input.ratingCount, input.ratingAverage, input.loanCount,
                input.loanScore, reputation, now,
            ),
        )
        options.deleteByPersonId(id)
        options.flush()
        val builder = entityManager.criteriaBuilder
        val query = builder.createTupleQuery()
        val rating = query.from(RatingEntity::class.java)
        query.multiselect(rating.get<UUID>("optionId"), builder.count(rating))
            .where(builder.equal(rating.get<UUID>("personId"), id), builder.isNotNull(rating.get<UUID>("optionId")))
            .groupBy(rating.get<UUID>("optionId"))
        options.saveAll(
            entityManager.createQuery(query).resultList.stream().map {
                RatingOptionTotalEntity(id, it.get(0, UUID::class.java), it.get(1, Long::class.javaObjectType))
            }.toList(),
        )
        queue.deleteById(id)
    }
}
