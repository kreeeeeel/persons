package com.persons.person.maintenance

import com.persons.person.dao.entity.PersonEntity
import com.persons.person.maintenance.dao.entity.AggregateQueueEntity
import com.persons.person.maintenance.dao.repository.AggregateQueueRepository
import com.persons.person.maintenance.dao.repository.PersonAggregateRepository
import com.persons.person.maintenance.dao.repository.RatingOptionTotalRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.stereotype.Service
import java.time.Clock
import java.util.UUID
import java.util.stream.Collectors

@Service
class PersonAggregateStore(
    private val entityManager: EntityManager,
    private val queue: AggregateQueueRepository,
    private val aggregates: PersonAggregateRepository,
    private val options: RatingOptionTotalRepository,
    private val clock: Clock,
) {
    // Serializes queue upserts with aggregate calculation on the same person row.
    fun request(personId: UUID) {
        val person = entityManager.find(PersonEntity::class.java, personId, LockModeType.PESSIMISTIC_WRITE)
        if (person != null) {
            queue.save(AggregateQueueEntity(personId, clock.instant()))
        }
    }

    fun get(personId: UUID): PersonAggregate {
        val row = aggregates.findById(personId).orElse(null)
        if (row == null) {
            return PersonAggregate()
        }
        return PersonAggregate(
            row.ratingCount, row.ratingAverage, row.loanCount, row.loanScore,
            row.reputation, row.calculatedAt, pending(personId),
        )
    }

    fun pending(personId: UUID): Boolean = queue.existsById(personId)

    fun optionCounts(personId: UUID): Map<UUID, Long> = options.findAll { row, _, builder ->
        builder.equal(row.get<UUID>("personId"), personId)
    }.stream().collect(Collectors.toMap({ it.optionId }, { it.votes }))
}
