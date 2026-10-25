package com.persons.person.dao.specification

import com.persons.person.dao.entity.ContentLikeEntity
import com.persons.person.domain.ContentKind
import com.persons.person.domain.FeedOrder
import com.persons.person.domain.ReactionKind
import org.springframework.data.jpa.domain.Specification
import java.time.Instant
import java.util.UUID

private const val ID = "id"
private const val CREATED_AT = "createdAt"
private const val TARGET_ID = "targetId"
private const val TARGET_KIND = "targetKind"
private const val REACTION = "reaction"

fun <T> orderContentFeed(order: FeedOrder, kind: ContentKind): Specification<T> = Specification { row, query, builder ->
    if (query != null && query.resultType != java.lang.Long::class.java) {
        val date = row.get<Instant>(CREATED_AT)
        val id = row.get<UUID>(ID)
        val newest = listOf(builder.desc(date), builder.desc(id))
        val ordering = when (order) {
            FeedOrder.NEWEST -> newest
            FeedOrder.OLDEST -> listOf(builder.asc(date), builder.asc(id))
            FeedOrder.MOST_LIKED, FeedOrder.MOST_DISLIKED -> {
                val votes = query.subquery(Long::class.javaObjectType)
                val reaction = votes.from(ContentLikeEntity::class.java)
                val selected = if (order == FeedOrder.MOST_LIKED) ReactionKind.LIKE else ReactionKind.DISLIKE
                votes.select(builder.count(reaction)).where(
                    builder.equal(reaction.get<UUID>(TARGET_ID), id),
                    builder.equal(reaction.get<ContentKind>(TARGET_KIND), kind),
                    builder.equal(reaction.get<ReactionKind>(REACTION), selected),
                )
                listOf(builder.desc(votes)) + newest
            }
        }
        query.orderBy(ordering)
    }
    builder.conjunction()
}
