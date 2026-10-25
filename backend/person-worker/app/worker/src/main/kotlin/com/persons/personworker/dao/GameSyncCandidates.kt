package com.persons.personworker.dao

import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.SocialLinkEntity
import com.persons.person.domain.SocialNetwork
import com.persons.person.maintenance.dao.repository.PersonRecordRepository
import com.persons.person.maintenance.dao.repository.SocialLinkRecordRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.UUID

@Service
class GameSyncCandidates(
    private val entityManager: EntityManager,
    private val persons: PersonRecordRepository,
    private val links: SocialLinkRecordRepository,
    private val clock: Clock,
) {
    fun <State : Any> select(
        type: Class<State>,
        from: Instant,
        interval: Duration,
        limit: Int,
        cursor: Boolean,
    ): List<
        Pair<
            UUID,
            String,
            >,
        > {
        val builder = entityManager.criteriaBuilder
        val query = builder.createTupleQuery()
        val person = query.from(PersonEntity::class.java)
        val link = query.from(SocialLinkEntity::class.java)
        val existing = query.subquery(UUID::class.java)
        val state = existing.from(type)
        existing.select(state.get("personId")).where(builder.equal(state.get<UUID>("personId"), person.get<UUID>("id")))
        val due = query.subquery(UUID::class.java)
        val candidate = due.from(type)
        val dueConditions = listOfNotNull(
            builder.isNull(candidate.get<Instant>("lastCompletedAt")),
            builder.lessThanOrEqualTo(candidate.get("lastCompletedAt"), clock.instant().minus(interval)),
            builder.notEqual(candidate.get<String>("sourceUrl"), link.get<String>("value")),
            builder.notEqual(candidate.get<Instant>("importFrom"), from),
            if (cursor) builder.greaterThan(candidate.get("nextPage"), 1) else null,
        )
        due.select(candidate.get("personId")).where(
            builder.equal(
                candidate.get<UUID>("personId"),
                person.get<UUID>("id"),
            ),

            builder.or(
                builder.isNull(candidate.get<Instant>("leaseUntil")),
                builder.lessThan(
                    candidate.get("leaseUntil"),
                    clock.instant(),
                ),
            ),

            builder.or(
                builder.isNull(candidate.get<Instant>("retryAt")),
                builder.lessThanOrEqualTo(
                    candidate.get("retryAt"),
                    clock.instant(),
                ),
            ),

            builder.or(*dueConditions.toTypedArray()),
        )
        val completed = query.subquery(Instant::class.java)
        val completedState = completed.from(type)
        completed.select(
            builder.coalesce(completedState.get<Instant>("retryAt"), completedState.get("lastCompletedAt")),
        )
            .where(builder.equal(completedState.get<UUID>("personId"), person.get<UUID>("id")))
        query.multiselect(person.get<UUID>("id"), link.get<String>("value"))
            .where(
                builder.equal(link.get<UUID>("personId"), person.get<UUID>("id")),
                builder.equal(link.get<SocialNetwork>("network"), SocialNetwork.STEAM),
                builder.isTrue(person.get("published")), builder.isFalse(person.get("deleted")),
                builder.or(builder.not(builder.exists(existing)), builder.exists(due)),
            )
            .orderBy(
                builder.asc(
                    builder.coalesce(
                        completed,
                        person.get<Instant>("createdAt"),
                    ),
                ),
                builder.asc(person.get<UUID>("id")),
            )
        return entityManager.createQuery(query).setMaxResults(limit).resultList.stream()
            .map { it.get(0, UUID::class.java) to it.get(1, String::class.java) }.toList()
    }

    fun linked(personId: UUID, url: String, lock: Boolean = false): Boolean {
        val person = if (lock) {
            entityManager.find(
                PersonEntity::class.java,
                personId,
                LockModeType.PESSIMISTIC_WRITE,
                mapOf("jakarta.persistence.lock.timeout" to -2),
            )
        } else {
            persons.findById(personId).orElse(null)
        }
        if (person == null || !person.published || person.deleted) {
            return false
        }
        return links.exists { row, _, builder ->
            builder.and(
                builder.equal(row.get<UUID>("personId"), personId),
                builder.equal(
                    row.get<SocialNetwork>("network"),
                    SocialNetwork.STEAM,
                ),
                builder.equal(
                    row.get<String>("value"),
                    url,
                ),
            )
        }
    }
}
