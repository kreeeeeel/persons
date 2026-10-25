package com.persons.person.service

import com.persons.person.contract.dto.CommunityFeedFilter
import com.persons.person.contract.dto.CommunityFeedKind
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.repository.CommunityFeedSources
import com.persons.person.domain.FeedEntry
import jakarta.persistence.EntityManager
import org.hibernate.query.criteria.HibernateCriteriaBuilder
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class CommunityFeedDao(private val entityManager: EntityManager, private val sources: CommunityFeedSources) {
    fun page(page: Int, size: Int, kind: CommunityFeedFilter?): Page<FeedEntry> {
        val builder = entityManager.criteriaBuilder as HibernateCriteriaBuilder
        val query = builder.createTupleQuery()
        val source = sources.root(query, builder)
        val person = query.from(PersonEntity::class.java)
        query.multiselect(
            source.get<String>("id"), source.get<String>("kind"),
            source.get<UUID>("personId"), source.get<Instant>("createdAt"),
        )
            .where(
                *listOfNotNull(
                    builder.equal(person.get<UUID>("id"), source.get<UUID>("personId")),
                    builder.isTrue(person.get("published")), builder.isFalse(person.get("deleted")),
                    kind?.let {
                        if (it == CommunityFeedFilter.GAME) {
                            source.get<String>("kind").`in`("DOTA", "CS")
                        } else {
                            builder.equal(source.get<String>("kind"), it.name)
                        }
                    },
                ).toTypedArray(),
            )
        val total = entityManager.createQuery(query.createCountQuery()).singleResult
        query.orderBy(
            builder.desc(source.get<Instant>("createdAt")), builder.asc(source.get<String>("kind")),
            builder.asc(source.get<UUID>("personId")), builder.asc(source.get<String>("id")),
        )
        val rows = entityManager.createQuery(query).setFirstResult(page * size).setMaxResults(size).resultList
        return PageImpl(
            rows.stream().map {
                FeedEntry(
                    it.get(0, String::class.java), CommunityFeedKind.valueOf(it.get(1, String::class.java)),
                    it.get(2, UUID::class.java), it.get(3, Instant::class.java),
                )
            }.toList(),
            PageRequest.of(page, size), total,
        )
    }
}
