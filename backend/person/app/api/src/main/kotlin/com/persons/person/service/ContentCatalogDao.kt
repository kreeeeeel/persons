package com.persons.person.service

import com.persons.person.contract.dto.AdminContentItem
import com.persons.person.contract.dto.AdminContentKind
import com.persons.person.contract.dto.AdminContentOrder
import com.persons.person.contract.dto.AdminContentPage
import com.persons.person.contract.dto.AdminContentStatistics
import com.persons.person.contract.dto.MediaKind
import com.persons.person.contract.dto.PublicationKind
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.repository.ContentCatalogQuery
import com.persons.person.dao.repository.ContentCatalogSources
import com.persons.person.domain.Actor
import com.persons.person.domain.AdminContentFilter
import com.persons.person.domain.MediaStatus
import com.persons.person.domain.ReviewStatus
import com.persons.person.exception.impl.NotFoundException
import jakarta.persistence.EntityManager
import jakarta.persistence.Tuple
import jakarta.persistence.criteria.Predicate
import org.hibernate.query.criteria.HibernateCriteriaBuilder
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.ZoneOffset
import java.util.Locale
import java.util.UUID
import java.util.stream.Collectors

@Service
class ContentCatalogDao(private val entityManager: EntityManager, private val sources: ContentCatalogSources) {
    private val builder: HibernateCriteriaBuilder get() = entityManager.criteriaBuilder as HibernateCriteriaBuilder

    fun authored(actor: Actor, kind: PublicationKind?, query: String, page: Int, size: Int): Page<AdminContentItem> {
        val catalog = base()
        val source = catalog.source
        val person = catalog.person
        val context = catalog.query.subquery(UUID::class.java)
        val media = context.from(MediaEntity::class.java)
        context.select(media.get("id")).where(
            builder.equal(media.get<UUID>("id"), source.get<UUID>("contextMediaId")),
            builder.equal(media.get<MediaStatus>("status"), MediaStatus.PUBLISHED),
        )
        val access = if (actor.administrator) {
            builder.conjunction()
        } else {
            builder.or(
                builder.isTrue(person.get("published")),
                builder.equal(person.get<UUID>("ownerAccountId"), actor.id),
            )
        }
        val conditions = listOfNotNull(
            builder.equal(person.get<UUID>("id"), source.get<UUID>("personId")),
            builder.equal(source.get<UUID>("authorId"), actor.id),
            source.get<String>("kind").`in`("COMMENT", "RATING", "PHOTO", "MOMENT", "CREDIT"),
            source.get<String>("sourceStatus").`in`(
                "PUBLISHED",
                "PENDING",
            ),
            builder.isFalse(person.get("deleted")),
            access,

            builder.or(builder.isNull(source.get<UUID>("contextMediaId")), builder.exists(context)),
            kind?.let { builder.equal(source.get<String>("kind"), it.name) },
            if (query.isBlank()) {
                null
            } else {
                builder.or(
                    builder.like(builder.lower(catalog.personName), pattern(query), '!'),
                    builder.like(builder.lower(person.get("tag")), pattern(query), '!'),
                )
            },
        )
        catalog.query.where(*conditions.toTypedArray())
        val total = entityManager.createQuery(catalog.query.createCountQuery()).singleResult
        order(catalog, AdminContentOrder.NEWEST)
        return PageImpl(items(catalog, page, size), PageRequest.of(page, size), total)
    }

    fun page(filter: AdminContentFilter, page: Int, size: Int, order: AdminContentOrder): AdminContentPage {
        val statistics = base()
        statistics.query.where(*conditions(statistics, filter.copy(status = null)).toTypedArray())
            .multiselect(
                statistics.status.alias("status"),
                builder.count(statistics.source.get<UUID>("id")).alias("total"),
            )
            .groupBy(statistics.status)
        val counts = entityManager.createQuery(statistics.query).resultList.stream().collect(
            Collectors.toMap({ it.get("status", String::class.java) }, { it.get("total", Long::class.javaObjectType) }),
        )
        val catalog = base()
        catalog.query.where(*conditions(catalog, filter).toTypedArray())
        order(catalog, order)
        val total = filter.status?.let { counts[it.name] ?: 0L } ?: counts.values.stream().mapToLong { it }.sum()
        return AdminContentPage(
            items(catalog, page, size), total, page, size,
            AdminContentStatistics(
                counts["PUBLISHED"] ?: 0L, counts["PENDING"] ?: 0L,
                counts["HIDDEN"] ?: 0L, counts["DRAFT"] ?: 0L,
            ),
        )
    }

    fun find(kind: AdminContentKind, id: UUID): AdminContentItem {
        val catalog = base()
        catalog.query.where(
            builder.equal(catalog.person.get<UUID>("id"), catalog.source.get<UUID>("personId")),
            builder.equal(
                catalog.source.get<String>("kind"),
                kind.name,
            ),
            builder.equal(
                catalog.source.get<UUID>("id"),
                id,
            ),

        )
        val row = entityManager.createQuery(catalog.query).setMaxResults(1).resultList.firstOrNull()
        if (row == null) {
            throw NotFoundException()
        }
        return item(row)
    }

    private fun base(): ContentCatalogQuery {
        val query = builder.createTupleQuery()
        val source = sources.root(query, builder)
        val person = query.from(PersonEntity::class.java)
        val status = builder.selectCase<String>().`when`(
            builder.or(
                builder.isTrue(person.get("deleted")),
                builder.and(
                    builder.isFalse(person.get("published")),
                    builder.equal(
                        source.get<String>("sourceStatus"),
                        "PUBLISHED",
                    ),
                ),

            ),
            "HIDDEN",
        )
            .otherwise(source.get<String>("sourceStatus"))
        val name = builder.trim(
            builder.concat(
                builder.concat(
                    builder.concat(person.get("lastName"), " "),
                    person.get("firstName"),
                ),
                builder.concat(" ", builder.coalesce(person.get<String>("patronymic"), "")),
            ),
        )
        val pending = query.subquery(UUID::class.java)
        val request = pending.from(ModerationEntity::class.java)
        pending.select(request.get("id")).where(
            builder.equal(request.get<UUID>("targetId"), source.get<UUID>("id")),
            builder.equal(request.get<ReviewStatus>("status"), ReviewStatus.PENDING),
        )
            .orderBy(builder.asc(request.get<Instant>("createdAt")), builder.asc(request.get<UUID>("id"))).fetch(1)
        query.multiselect(
            source.get<UUID>("id").alias("id"), source.get<UUID>("personId").alias("personId"),
            source.get<UUID>("authorId").alias("authorId"), source.get<String>("authorName").alias("authorName"),
            source.get<String>("kind").alias("kind"), status.alias("status"), source.get<String>("body").alias("body"),
            source.get<Instant>("createdAt").alias("createdAt"), source.get<UUID>("mediaId").alias("mediaId"),
            source.get<String>("mediaKind").alias("mediaKind"),
            source.get<UUID>("contextMediaId").alias("contextMediaId"),

            source.get<Boolean>("previewAvailable").alias("previewAvailable"),
            source.get<Boolean>("mediaAvailable").alias("mediaAvailable"),

            source.get<Long>("sizeBytes").alias("sizeBytes"),
            person.get<String>("tag").alias("personTag"),
            name.alias("personName"),

            person.get<UUID>("avatarMediaId").alias("personAvatarMediaId"), pending.alias("pendingRequestId"),
        )
        return ContentCatalogQuery(query, source, person, status, name)
    }

    private fun conditions(catalog: ContentCatalogQuery, filter: AdminContentFilter): List<Predicate> {
        val row = catalog.source
        return listOfNotNull(
            builder.equal(catalog.person.get<UUID>("id"), row.get<UUID>("personId")),
            filter.kind?.let { builder.equal(row.get<String>("kind"), it.name) },
            filter.status?.let {
                val hidden = builder.or(
                    builder.isTrue(catalog.person.get("deleted")),
                    builder.and(
                        builder.isFalse(catalog.person.get("published")),
                        builder.equal(row.get<String>("sourceStatus"), "PUBLISHED"),
                    ),
                )
                if (it.name == "HIDDEN") {
                    builder.or(hidden, builder.equal(row.get<String>("sourceStatus"), "HIDDEN"))
                } else {
                    builder.and(builder.not(hidden), builder.equal(row.get<String>("sourceStatus"), it.name))
                }
            },
            filter.authorId?.let { builder.equal(row.get<UUID>("authorId"), it) },
            filter.personId?.let { builder.equal(row.get<UUID>("personId"), it) },
            filter.createdFrom?.let { builder.greaterThanOrEqualTo(row.get("createdAt"), it) },
            filter.createdTo?.let { builder.lessThan(row.get("createdAt"), it) },
            if (filter.query.isBlank()) {
                null
            } else {
                builder.or(
                    builder.like(builder.lower(row.get("body")), pattern(filter.query), '!'),
                    builder.like(builder.lower(row.get("authorName")), pattern(filter.query), '!'),
                    builder.like(builder.lower(catalog.personName), pattern(filter.query), '!'),
                    builder.like(builder.lower(catalog.person.get("tag")), pattern(filter.query), '!'),
                )
            },
        )
    }

    private fun order(catalog: ContentCatalogQuery, order: AdminContentOrder) {
        val row = catalog.source
        val first = when (order) {
            AdminContentOrder.NEWEST -> builder.desc(row.get<Instant>("createdAt"))
            AdminContentOrder.OLDEST -> builder.asc(row.get<Instant>("createdAt"))
            AdminContentOrder.AUTHOR -> builder.asc(builder.lower(row.get("authorName")))
            AdminContentOrder.PAGE -> builder.asc(builder.lower(catalog.personName))
            AdminContentOrder.TYPE -> builder.asc(row.get<String>("kind"))
        }
        catalog.query.orderBy(
            first,
            builder.desc(row.get<Instant>("createdAt")),
            builder.asc(row.get<String>("kind")),
            builder.asc(row.get<UUID>("id")),
        )
    }

    private fun items(catalog: ContentCatalogQuery, page: Int, size: Int): List<AdminContentItem> =
        entityManager.createQuery(catalog.query)
            .setFirstResult(page * size).setMaxResults(size).resultList.stream().map(::item).toList()

    private fun pattern(value: String): String =
        "%${value.trim().lowercase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_")}%"

    private fun item(row: Tuple): AdminContentItem = AdminContentItem(
        id = row.get("id", UUID::class.java), kind = AdminContentKind.valueOf(row.get("kind", String::class.java)),
        status = com.persons.person.contract.dto.AdminContentStatus.valueOf(row.get("status", String::class.java)),
        personId = row.get("personId", UUID::class.java), personTag = row.get("personTag", String::class.java),
        personName = row.get("personName", String::class.java), text = row.get("body", String::class.java),
        authorName = row.get(
            "authorName",
            String::class.java,
        ),
        createdAt = row.get(
            "createdAt",
            Instant::class.java,
        ).atOffset(ZoneOffset.UTC),

        previewAvailable = row.get(
            "previewAvailable",
            Boolean::class.javaObjectType,
        ),
        mediaAvailable = row.get(
            "mediaAvailable",
            Boolean::class.javaObjectType,
        ),

        authorId = row.get("authorId", UUID::class.java), mediaId = row.get("mediaId", UUID::class.java),
        mediaKind = row.get(
            "mediaKind",
            String::class.java,
        )?.let(MediaKind::valueOf),
        contextMediaId = row.get(
            "contextMediaId",
            UUID::class.java,
        ),

        pendingRequestId = row.get(
            "pendingRequestId",
            UUID::class.java,
        ),
        personAvatarMediaId = row.get(
            "personAvatarMediaId",
            UUID::class.java,
        ),

        sizeBytes = row.get("sizeBytes", Long::class.javaObjectType),
    )
}
