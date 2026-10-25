package com.persons.person.dao.repository

import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.entity.CreditEntryEntity
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.RatingEntity
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import jakarta.persistence.Tuple
import jakarta.persistence.criteria.Expression
import jakarta.persistence.criteria.Selection
import org.hibernate.query.criteria.HibernateCriteriaBuilder
import org.hibernate.query.criteria.JpaCriteriaQuery
import org.hibernate.query.criteria.JpaDerivedRoot
import org.hibernate.query.criteria.JpaSubQuery
import org.springframework.stereotype.Component
import java.time.Instant
import java.util.UUID

@Component
class ContentCatalogSources {
    fun root(query: JpaCriteriaQuery<Tuple>, builder: HibernateCriteriaBuilder): JpaDerivedRoot<Tuple> = query.from(
        builder.unionAll(
            persons(query, builder),
            media(query, builder),
            comments(query, builder),
            credits(query, builder),
            ratings(query, builder),
        ),
    )

    private fun persons(parent: JpaCriteriaQuery<Tuple>, builder: HibernateCriteriaBuilder): JpaSubQuery<Tuple> {
        val query = parent.subquery(Tuple::class.java)
        val row = query.from(PersonEntity::class.java)
        val author = query.subquery(UUID::class.java)
        val request = author.from(ModerationEntity::class.java)
        author.select(request.get("authorId")).where(
            builder.equal(request.get<UUID>("targetId"), row.get<UUID>("id")),
            builder.equal(request.get<ChangeKind>("kind"), ChangeKind.CREATE_PERSON),
        )
            .orderBy(builder.asc(request.get<Instant>("createdAt")), builder.asc(request.get<UUID>("id"))).fetch(1)
        val authorName = query.subquery(String::class.java)
        val named = authorName.from(ModerationEntity::class.java)
        authorName.select(named.get("authorName")).where(
            builder.equal(named.get<UUID>("targetId"), row.get<UUID>("id")),
            builder.equal(named.get<ChangeKind>("kind"), ChangeKind.CREATE_PERSON),
        )
            .orderBy(builder.asc(named.get<Instant>("createdAt")), builder.asc(named.get<UUID>("id"))).fetch(1)
        return query.multiselect(
            columns(
                builder, row.get("id"), row.get("id"), builder.coalesce(author, row.get("ownerAccountId")),
                builder.coalesce(authorName, ""), builder.literal("PERSON"),
                builder.selectCase<String>().`when`(builder.isTrue(row.get("deleted")), "HIDDEN")
                    .`when`(builder.isTrue(row.get("published")), "PUBLISHED").otherwise("PENDING"),
                row.get("description"), row.get("createdAt"),
            ),
        )
    }

    private fun media(parent: JpaCriteriaQuery<Tuple>, builder: HibernateCriteriaBuilder): JpaSubQuery<Tuple> {
        val query = parent.subquery(Tuple::class.java)
        val row = query.from(MediaEntity::class.java)
        val kind = builder.selectCase<String>().`when`(
            builder.equal(
                row.get<MediaKind>("kind"),
                MediaKind.PHOTO,
            ),
            "PHOTO",
        )
            .`when`(builder.equal(row.get<MediaKind>("kind"), MediaKind.MOMENT), "MOMENT").otherwise("AVATAR")
        val status = builder.selectCase<String>().`when`(
            row.get<MediaStatus>("status").`in`(
                MediaStatus.DELETED,
                MediaStatus.PURGED,
            ),
            "HIDDEN",
        )
            .`when`(builder.equal(row.get<MediaStatus>("status"), MediaStatus.STAGED), "DRAFT")
            .`when`(
                builder.equal(
                    row.get<MediaStatus>("status"),
                    MediaStatus.PUBLISHED,
                ),
                "PUBLISHED",
            ).otherwise("PENDING")
        return query.multiselect(
            columns(
                builder, row.get("id"), row.get("personId"), row.get("uploaderId"), row.get("uploaderName"),
                kind, status, row.get("caption"), row.get("createdAt"), mediaId = row.get("id"), mediaKind = kind,
                previewAvailable = builder.isNotNull(row.get<String>("previewObjectKey")),
                mediaAvailable = builder.selectCase<Boolean>()
                    .`when`(row.get<MediaStatus>("status").`in`(MediaStatus.STAGED, MediaStatus.PURGED), false)
                    .otherwise(true),
                sizeBytes = row.get("sizeBytes"),
            ),
        )
            .where(row.get<MediaKind>("kind").`in`(MediaKind.PHOTO, MediaKind.MOMENT, MediaKind.AVATAR))
    }

    private fun comments(parent: JpaCriteriaQuery<Tuple>, builder: HibernateCriteriaBuilder): JpaSubQuery<Tuple> {
        val query = parent.subquery(Tuple::class.java)
        val row = query.from(CommentEntity::class.java)
        val status = builder.selectCase<String>().`when`(builder.isTrue(row.get("deleted")), "HIDDEN")
            .`when`(builder.isTrue(row.get("published")), "PUBLISHED").otherwise("PENDING")
        return query.multiselect(
            columns(
                builder, row.get("id"), row.get("personId"), row.get("authorId"), row.get("authorName"),
                builder.literal("COMMENT"), status, row.get("text"), row.get("createdAt"),
                contextMediaId = builder.coalesce(row.get("mediaId"), row.get("momentId")),
            ),
        )
    }

    private fun credits(parent: JpaCriteriaQuery<Tuple>, builder: HibernateCriteriaBuilder): JpaSubQuery<Tuple> {
        val query = parent.subquery(Tuple::class.java)
        val row = query.from(CreditEntryEntity::class.java)
        val status = builder.selectCase<String>().`when`(builder.isTrue(row.get("deleted")), "HIDDEN")
            .`when`(builder.isTrue(row.get("published")), "PUBLISHED").otherwise("PENDING")
        return query.multiselect(
            columns(
                builder, row.get("id"), row.get("personId"), row.get("authorId"), row.get("authorName"),
                builder.literal("CREDIT"), status, row.get("description"), row.get("createdAt"),
            ),
        )
    }

    private fun ratings(parent: JpaCriteriaQuery<Tuple>, builder: HibernateCriteriaBuilder): JpaSubQuery<Tuple> {
        val query = parent.subquery(Tuple::class.java)
        val row = query.from(RatingEntity::class.java)
        val body = builder.concat(
            builder.concat(builder.concat(row.get("emoji"), " "), row.get<Int>("value").`as`(String::class.java)),
            builder.concat("/5 ", builder.coalesce(row.get<String>("comment"), "")),
        )
        return query.multiselect(
            columns(
                builder, row.get("id"), row.get("personId"), row.get("userId"), row.get("authorName"),
                builder.literal("RATING"), builder.literal("PUBLISHED"), body, row.get("createdAt"),
            ),
        )
    }

    private fun columns(
        builder: HibernateCriteriaBuilder,
        id: Expression<UUID>,
        person: Expression<UUID>,
        author: Expression<UUID>,
        authorName: Expression<String>,
        kind: Expression<String>,
        status: Expression<String>,
        body: Expression<String>,
        createdAt: Expression<Instant>,
        mediaId: Expression<UUID>? = null,
        mediaKind: Expression<String>? = null,
        contextMediaId: Expression<UUID>? = null,
        previewAvailable: Expression<Boolean>? = null,
        mediaAvailable: Expression<Boolean>? = null,
        sizeBytes: Expression<Long>? = null,
    ): List<Selection<*>> = listOf(
        // Criteria aliases mutate expressions; wrap the paths reused by other columns.
        builder.coalesce(id, id).alias("id"),
        person.alias("personId"),
        author.alias("authorId"),
        authorName.alias("authorName"),
        builder.coalesce(kind, kind).alias("kind"),
        status.alias("sourceStatus"),
        body.alias("body"),
        createdAt.alias("createdAt"),
        (mediaId ?: builder.cast(builder.nullLiteral(UUID::class.java), UUID::class.java)).alias("mediaId"),
        (mediaKind ?: builder.cast(builder.nullLiteral(String::class.java), String::class.java)).alias("mediaKind"),
        (contextMediaId ?: builder.cast(builder.nullLiteral(UUID::class.java), UUID::class.java))
            .alias("contextMediaId"),
        (previewAvailable ?: builder.literal(false)).alias("previewAvailable"),
        (mediaAvailable ?: builder.literal(false)).alias("mediaAvailable"),
        (sizeBytes ?: builder.cast(builder.nullLiteral(Long::class.javaObjectType), Long::class.javaObjectType))
            .alias("sizeBytes"),
    )
}
