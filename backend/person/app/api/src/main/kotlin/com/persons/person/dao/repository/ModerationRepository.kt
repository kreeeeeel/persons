package com.persons.person.dao.repository

import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.specification.automaticallyApproved
import com.persons.person.dao.specification.matching
import com.persons.person.dao.specification.moderationMatching
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.ModerationCount
import com.persons.person.domain.ModerationFilter
import com.persons.person.domain.ReviewStatus
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID
import java.util.stream.Collectors

private const val PERSON_ID = "personId"
private const val TARGET_ID = "targetId"
private const val AUTHOR_ID = "authorId"
private const val KIND = "kind"
private const val STATUS = "status"
private const val LOCK_QUERY = "select r from ModerationEntity r where r.id = :id"
private const val PERSON_QUERY = "select r.personId from ModerationEntity r where r.id = :id"
private const val PENDING_COUNTS_QUERY = """
    select r.personId, count(r) from ModerationEntity r where r.personId in :ids and r.status =
    com.persons.person.domain.ReviewStatus.PENDING group by r.personId
"""

@Repository
class ModerationRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<ModerationEntity, UUID>(ModerationEntity::class.java, entityManager) {
    fun personId(id: UUID): UUID? = entityManager.createQuery(PERSON_QUERY, UUID::class.java)
        .setParameter("id", id).resultList.firstOrNull()
    fun locked(id: UUID): ModerationEntity? = entityManager.createQuery(LOCK_QUERY, ModerationEntity::class.java)
        .setParameter("id", id).setLockMode(LockModeType.PESSIMISTIC_WRITE).resultList.firstOrNull()
    fun pendingForAuthor(id: UUID): Long = count(matching(AUTHOR_ID to id, STATUS to ReviewStatus.PENDING))
    fun pendingClaim(personId: UUID, actorId: UUID): Boolean = exists(
        matching(
            PERSON_ID to personId, AUTHOR_ID to actorId, KIND to ChangeKind.CLAIM_OWNERSHIP,
            STATUS to ReviewStatus.PENDING,
        ),
    )
    fun pendingForTarget(id: UUID, kind: ChangeKind): Boolean = exists(
        matching(
            TARGET_ID to id, KIND to kind,
            STATUS to ReviewStatus.PENDING,
        ),
    )
    fun page(status: ReviewStatus, pageable: Pageable): Page<ModerationEntity> =
        findAll(matching(STATUS to status), pageable)

    fun page(filter: ModerationFilter, pageable: Pageable): Page<ModerationEntity> =
        findAll(moderationMatching(filter), pageable)

    fun counts(filter: ModerationFilter): List<ModerationCount> {
        val builder = entityManager.criteriaBuilder
        val query = builder.createQuery(Array<Any>::class.java)
        val row = query.from(ModerationEntity::class.java)
        query.multiselect(
            row.get<ReviewStatus>(STATUS), builder.count(row), builder.least(row.get<Instant>("createdAt")),
        )
            .where(moderationMatching(filter.copy(status = null)).toPredicate(row, query, builder))
            .groupBy(row.get<ReviewStatus>(STATUS))
        return entityManager.createQuery(query).resultList.stream().map {
            ModerationCount(it[0] as ReviewStatus, it[1] as Long, it[2] as Instant)
        }.toList()
    }

    fun overdue(filter: ModerationFilter, before: Instant): Long = count(
        moderationMatching(
            filter.copy(
                status = ReviewStatus.PENDING,
                createdTo = filter.createdTo?.takeIf { it < before } ?: before,
            ),
        ),
    )

    fun automaticCount(filter: ModerationFilter): Long = count(
        moderationMatching(filter.copy(status = ReviewStatus.APPROVED)).and(automaticallyApproved()),
    )
    fun pendingCounts(ids: List<UUID>): Map<UUID, Long> = if (ids.isEmpty()) {
        emptyMap()
    } else {
        entityManager.createQuery(PENDING_COUNTS_QUERY, Array<Any>::class.java)
            .setParameter("ids", ids).resultList.stream().collect(
                Collectors.toMap({
                    it[0] as UUID
                }, { it[1] as Long }),
            )
    }
    fun pendingRows(personId: UUID): List<ModerationEntity> = findAll(
        matching(
            PERSON_ID to personId,
            STATUS to ReviewStatus.PENDING,
        ),
    )

    fun pendingChanges(ids: List<UUID>, authorId: UUID, kind: ChangeKind): List<ModerationEntity> = if (ids.isEmpty()) {
        emptyList()
    } else {
        findAll(
            Specification { row, _, builder ->
                builder.and(
                    row.get<UUID>(TARGET_ID).`in`(ids), builder.equal(row.get<UUID>(AUTHOR_ID), authorId),
                    builder.equal(
                        row.get<ChangeKind>(KIND),
                        kind,
                    ),
                    builder.equal(
                        row.get<ReviewStatus>(STATUS),
                        ReviewStatus.PENDING,
                    ),

                )
            },
        )
    }

    fun pendingComments(): List<ModerationEntity> = findAll(
        matching(
            KIND to ChangeKind.CREATE_COMMENT,
            STATUS to ReviewStatus.PENDING,
        ),
    )
}
