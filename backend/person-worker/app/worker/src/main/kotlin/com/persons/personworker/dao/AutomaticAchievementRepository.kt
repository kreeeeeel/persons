package com.persons.personworker.dao

import com.persons.person.dao.entity.AchievementEntity
import com.persons.person.dao.entity.PersonAchievementEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.domain.AchievementType
import com.persons.person.maintenance.dao.repository.PersonAchievementRecordRepository
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Predicate
import jakarta.persistence.criteria.Root
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID
import java.util.stream.Stream

@Service
class AutomaticAchievementRepository(
    private val grants: PersonAchievementRecordRepository,
    private val entityManager: EntityManager,
) {
    // Definition locks serialize grants with edits and with other worker replicas.
    @Transactional
    fun grantDue(now: Instant, limit: Int): Int {
        val builder = entityManager.criteriaBuilder
        val query = builder.createQuery(AchievementEntity::class.java)
        val row = query.from(AchievementEntity::class.java)
        query.select(row).where(
            builder.isTrue(row.get("active")), builder.isFalse(row.get("deleted")),
            builder.equal(row.get<AchievementType>("type"), AchievementType.AUTOMATIC),
        )
            .orderBy(builder.asc(row.get<Int>("pageAgeYears")), builder.asc(row.get<UUID>("id")))
        return entityManager.createQuery(query).setLockMode(LockModeType.PESSIMISTIC_WRITE)
            .setHint("jakarta.persistence.lock.timeout", -2).resultList.stream().flatMap { definition ->
                val years = definition.pageAgeYears
                if (years == null) {
                    Stream.empty<Pair<UUID, UUID>>()
                } else {
                    eligible(definition, years, now, limit).stream().map { it to definition.id }
                }
            }.limit(limit.toLong()).mapToInt { (person, achievement) ->
                grants.save(PersonAchievementEntity(personId = person, achievementId = achievement, assignedAt = now))
                1
            }.sum().also { grants.flush() }
    }

    private fun eligible(definition: AchievementEntity, years: Int, now: Instant, limit: Int): List<UUID> {
        val builder = entityManager.criteriaBuilder
        val query = builder.createQuery(UUID::class.java)
        val person = query.from(PersonEntity::class.java)
        val existing = query.subquery(UUID::class.java)
        val grant = existing.from(PersonAchievementEntity::class.java)
        existing.select(grant.get("id")).where(
            builder.equal(grant.get<UUID>("personId"), person.get<UUID>("id")),
            builder.equal(grant.get<UUID>("achievementId"), definition.id),
        )
        query.select(person.get("id")).where(
            builder.isTrue(person.get("published")),
            builder.isFalse(person.get("deleted")),

            due(builder, person, years, now), builder.not(builder.exists(existing)),
        )
            .orderBy(builder.asc(person.get<Instant>("createdAt")), builder.asc(person.get<UUID>("id")))
        return entityManager.createQuery(query).setMaxResults(limit).resultList
    }

    private fun due(builder: CriteriaBuilder, person: Root<PersonEntity>, years: Int, now: Instant): Predicate {
        val date = now.atOffset(ZoneOffset.UTC)
        val cutoff = date.minusYears(years.toLong())
        val ordinary = builder.lessThanOrEqualTo(person.get("createdAt"), cutoff.toInstant())
        // Feb 29 anniversaries fall on Feb 28 in a non-leap anniversary year.
        if (date.monthValue == 2 &&
            date.dayOfMonth == 28 &&
            !date.toLocalDate().isLeapYear &&
            cutoff.toLocalDate().isLeapYear
        ) {
            val leapDay = LocalDate.of(cutoff.year, 2, 29)
            return builder.or(
                ordinary,
                builder.between(
                    person.get("createdAt"),
                    leapDay.atStartOfDay().toInstant(ZoneOffset.UTC),
                    leapDay.atTime(date.toLocalTime()).toInstant(ZoneOffset.UTC),
                ),
            )
        }
        return ordinary
    }
}
