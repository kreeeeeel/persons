package com.persons.person.dao.repository

import com.persons.person.dao.entity.AchievementEntity
import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.entity.CreditEntryEntity
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.PersonAchievementEntity
import com.persons.person.dao.entity.RatingEntity
import com.persons.person.dao.entity.SocialLinkEntity
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import com.persons.person.domain.SocialNetwork
import com.persons.person.maintenance.dao.entity.CsMatchEntity
import com.persons.person.maintenance.dao.entity.DotaMatchEntity
import com.persons.person.maintenance.dao.entity.LeetifySyncEntity
import jakarta.persistence.Tuple
import jakarta.persistence.criteria.Expression
import jakarta.persistence.criteria.Selection
import org.hibernate.query.criteria.HibernateCriteriaBuilder
import org.hibernate.query.criteria.JpaCriteriaQuery
import org.hibernate.query.criteria.JpaDerivedRoot
import org.hibernate.query.criteria.JpaExpression
import org.hibernate.query.criteria.JpaSubQuery
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.UUID

@Component
class CommunityFeedSources(private val clock: Clock) {
    fun root(query: JpaCriteriaQuery<Tuple>, builder: HibernateCriteriaBuilder): JpaDerivedRoot<Tuple> = query.from(
        builder.unionAll(
            comments(query, builder), media(query, builder), ratings(query, builder), credits(query, builder),
            achievements(query, builder), dota(query, builder), cs(query, builder),
        ),
    )

    private fun comments(parent: JpaCriteriaQuery<Tuple>, builder: HibernateCriteriaBuilder): JpaSubQuery<Tuple> {
        val query = parent.subquery(Tuple::class.java)
        val row = query.from(CommentEntity::class.java)
        val contextId = builder.coalesce(row.get<UUID>("mediaId"), row.get<UUID>("momentId"))
        val context = query.subquery(UUID::class.java)
        val media = context.from(MediaEntity::class.java)
        context.select(media.get("id")).where(
            builder.equal(media.get<UUID>("id"), contextId),
            builder.equal(media.get<UUID>("personId"), row.get<UUID>("personId")),
            builder.equal(media.get<MediaStatus>("status"), MediaStatus.PUBLISHED),
            media.get<MediaKind>("kind").`in`(MediaKind.PHOTO, MediaKind.MOMENT),
        )
        val kind = builder.selectCase<String>().`when`(builder.isNull(contextId), "WALL").otherwise("COMMENT")
        return query.multiselect(columns(builder, row.get<UUID>("id"), kind, row.get("personId"), row.get("createdAt")))
            .where(
                builder.isTrue(row.get("published")), builder.isFalse(row.get("deleted")),
                builder.or(builder.isNull(contextId), builder.exists(context)),
            )
    }

    private fun media(parent: JpaCriteriaQuery<Tuple>, builder: HibernateCriteriaBuilder): JpaSubQuery<Tuple> {
        val query = parent.subquery(Tuple::class.java)
        val row = query.from(MediaEntity::class.java)
        val kind = builder.selectCase<String>()
            .`when`(builder.equal(row.get<MediaKind>("kind"), MediaKind.PHOTO), "PHOTO").otherwise("MOMENT")
        return query.multiselect(columns(builder, row.get<UUID>("id"), kind, row.get("personId"), row.get("createdAt")))
            .where(
                builder.equal(row.get<MediaStatus>("status"), MediaStatus.PUBLISHED),
                row.get<MediaKind>("kind").`in`(MediaKind.PHOTO, MediaKind.MOMENT),
            )
    }

    private fun ratings(parent: JpaCriteriaQuery<Tuple>, builder: HibernateCriteriaBuilder): JpaSubQuery<Tuple> {
        val query = parent.subquery(Tuple::class.java)
        val row = query.from(RatingEntity::class.java)
        return query.multiselect(
            columns(builder, row.get<UUID>("id"), builder.literal("RATING"), row.get("personId"), row.get("createdAt")),
        )
    }

    private fun credits(parent: JpaCriteriaQuery<Tuple>, builder: HibernateCriteriaBuilder): JpaSubQuery<Tuple> {
        val query = parent.subquery(Tuple::class.java)
        val row = query.from(CreditEntryEntity::class.java)
        return query.multiselect(
            columns(builder, row.get<UUID>("id"), builder.literal("LOAN"), row.get("personId"), row.get("createdAt")),
        ).where(builder.isTrue(row.get("published")), builder.isFalse(row.get("deleted")))
    }

    private fun achievements(parent: JpaCriteriaQuery<Tuple>, builder: HibernateCriteriaBuilder): JpaSubQuery<Tuple> {
        val query = parent.subquery(Tuple::class.java)
        val row = query.from(PersonAchievementEntity::class.java)
        val achievement = query.from(AchievementEntity::class.java)
        return query.multiselect(
            columns(
                builder, row.get<UUID>("id"), builder.literal("ACHIEVEMENT"),
                row.get("personId"), row.get("assignedAt"),
            ),
        ).where(
            builder.equal(achievement.get<UUID>("id"), row.get<UUID>("achievementId")),
            builder.isTrue(achievement.get("active")), builder.isFalse(achievement.get("deleted")),
        )
    }

    private fun dota(parent: JpaCriteriaQuery<Tuple>, builder: HibernateCriteriaBuilder): JpaSubQuery<Tuple> {
        val query = parent.subquery(Tuple::class.java)
        val row = query.from(DotaMatchEntity::class.java)
        return query.multiselect(
            columns(
                builder, row.get<Long>("matchId"), builder.literal("DOTA"),
                row.get("personId"), row.get("playedAt"),
            ),
        )
    }

    private fun cs(parent: JpaCriteriaQuery<Tuple>, builder: HibernateCriteriaBuilder): JpaSubQuery<Tuple> {
        val query = parent.subquery(Tuple::class.java)
        val row = query.from(CsMatchEntity::class.java)
        val linked = query.subquery(UUID::class.java)
        val link = linked.from(SocialLinkEntity::class.java)
        val sync = linked.from(LeetifySyncEntity::class.java)
        linked.select(link.get("id")).where(
            builder.equal(link.get<UUID>("personId"), row.get<UUID>("personId")),
            builder.equal(link.get<SocialNetwork>("network"), SocialNetwork.STEAM),
            builder.equal(sync.get<UUID>("personId"), row.get<UUID>("personId")),
            builder.equal(link.get<String>("value"), sync.get<String>("snapshotSourceUrl")),
            builder.greaterThan(sync.get("lastCompletedAt"), clock.instant().minus(Duration.ofDays(1))),
        )
        return query.multiselect(
            columns(builder, row.get<UUID>("matchId"), builder.literal("CS"), row.get("personId"), row.get("playedAt")),
        ).where(builder.exists(linked))
    }

    private fun <T : Any> columns(
        builder: HibernateCriteriaBuilder,
        id: JpaExpression<T>,
        kind: Expression<String>,
        personId: Expression<UUID>,
        createdAt: Expression<Instant>,
    ): List<Selection<*>> = listOf(
        builder.cast(id, String::class.java).alias("id"), kind.alias("kind"),
        personId.alias("personId"), createdAt.alias("createdAt"),
    )
}
