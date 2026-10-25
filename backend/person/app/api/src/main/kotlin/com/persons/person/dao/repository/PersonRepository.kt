package com.persons.person.dao.repository

import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.SearchKeywordEntity
import com.persons.person.dao.specification.matching
import com.persons.person.exception.impl.InvalidInputException
import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.Locale
import java.util.UUID

private const val TAG = "tag"
private const val PUBLISHED = "published"
private const val DELETED = "deleted"
private const val FIRST_NAME = "firstName"
private const val LAST_NAME = "lastName"
private const val PATRONYMIC = "patronymic"
private const val PERSON_ID = "personId"
private const val ID = "id"
private const val KEYWORD = "keyword"
private const val LOCK_QUERY = "select p from PersonEntity p where p.id = :id"

@Repository
class PersonRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<PersonEntity, UUID>(PersonEntity::class.java, entityManager) {
    fun byTag(tag: String): PersonEntity? = findOne(matching(TAG to tag)).orElse(null)

    fun recommendations(ownerId: UUID?, size: Int): List<PersonEntity> = entityManager.createQuery(
        """select p from PersonEntity p where p.published = true and p.deleted = false
            and (:owner is null or p.ownerAccountId is null or p.ownerAccountId <> :owner)
            order by function('random')""",
        PersonEntity::class.java,
    ).setParameter("owner", ownerId).setMaxResults(size).resultList

    fun byOwner(id: UUID): PersonEntity? = findOne(matching("ownerAccountId" to id, DELETED to false)).orElse(null)

    fun byOwners(ids: List<UUID>): List<PersonEntity> = if (ids.isEmpty()) {
        emptyList()
    } else {
        findAll(
            Specification { row, _, builder ->
                builder.and(
                    row.get<UUID>("ownerAccountId").`in`(ids),
                    builder.isFalse(row.get(DELETED)),
                    builder.isTrue(row.get(PUBLISHED)),
                )
            },
        )
    }

    fun locked(id: UUID): PersonEntity? = entityManager.createQuery(LOCK_QUERY, PersonEntity::class.java)
        .setParameter("id", id).setLockMode(LockModeType.PESSIMISTIC_WRITE).resultList.firstOrNull()

    fun advanceVersion(person: PersonEntity) {
        entityManager.lock(person, LockModeType.PESSIMISTIC_FORCE_INCREMENT)
    }

    fun search(query: String, pageable: Pageable, administrator: Boolean): Page<PersonEntity> {
        val escaped = query.trim().lowercase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        val pattern = "%$escaped%"
        val specification = Specification<PersonEntity> { row, criteria, builder ->
            val name = builder.concat(builder.concat(row.get<String>(LAST_NAME), " "), row.get<String>(FIRST_NAME))
            val fullName = builder.concat(builder.concat(name, " "), builder.coalesce(row.get<String>(PATRONYMIC), ""))
            val keywordQuery = criteria?.subquery(UUID::class.java) ?: throw InvalidInputException()
            val keyword = keywordQuery.from(SearchKeywordEntity::class.java)
            keywordQuery.select(keyword.get(ID)).where(
                builder.equal(keyword.get<UUID>(PERSON_ID), row.get<UUID>(ID)),
                builder.like(keyword.get(KEYWORD), pattern, '\\'),
            )
            val matches = builder.or(
                builder.like(builder.lower(row.get(TAG)), pattern, '\\'),
                builder.like(builder.lower(fullName), pattern, '\\'),
                builder.exists(keywordQuery),
            )
            if (administrator) {
                builder.and(builder.isFalse(row.get(DELETED)), matches)
            } else {
                builder.and(builder.isFalse(row.get(DELETED)), builder.isTrue(row.get(PUBLISHED)), matches)
            }
        }

        return findAll(specification, pageable)
    }
}
