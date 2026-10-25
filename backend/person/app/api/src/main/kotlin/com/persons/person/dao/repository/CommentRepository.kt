package com.persons.person.dao.repository

import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.specification.matching
import com.persons.person.dao.specification.orderContentFeed
import com.persons.person.dao.specification.visibleCommentEvents
import com.persons.person.domain.ContentKind
import com.persons.person.domain.FeedOrder
import jakarta.persistence.EntityManager
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID
import java.util.stream.Collectors

private const val PERSON_ID = "personId"
private const val MEDIA_ID = "mediaId"
private const val DELETED = "deleted"
private const val COUNTS_QUERY = """
    select c.mediaId, count(c) from CommentEntity c where c.mediaId in :ids and c.deleted = false and c.published = true
    group by c.mediaId
"""

@Repository
class CommentRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<CommentEntity, UUID>(CommentEntity::class.java, entityManager) {
    fun events(pageable: Pageable): Page<CommentEntity> = findAll(
        visibleCommentEvents().and(orderContentFeed(FeedOrder.NEWEST, ContentKind.COMMENT)), pageable,
    )

    fun page(
        personId: UUID,
        mediaId: UUID?,
        pageable: Pageable,
        authorId: UUID? = null,
        order: FeedOrder = FeedOrder.NEWEST,
        mine: Boolean = false,
    ): Page<CommentEntity> = findAll(
        matching<CommentEntity>(PERSON_ID to personId, MEDIA_ID to mediaId, DELETED to false).and(
            Specification {
                    row,
                    _,
                    builder,
                ->
                if (mine) {
                    builder.equal(row.get<UUID>("authorId"), authorId)
                } else if (authorId == null) {
                    builder.isTrue(row.get("published"))
                } else {
                    builder.or(
                        builder.isTrue(row.get("published")), builder.equal(row.get<UUID>("authorId"), authorId),
                    )
                }
            },
        ).and(orderContentFeed(order, ContentKind.COMMENT)),
        pageable,
    )
    fun total(personId: UUID): Long = count(
        matching(
            PERSON_ID to personId, MEDIA_ID to null, DELETED to false,
            "published" to true,
        ),
    )
    fun counts(ids: List<UUID>): Map<UUID, Long> = if (ids.isEmpty()) {
        emptyMap()
    } else {
        entityManager.createQuery(COUNTS_QUERY, Array<Any>::class.java)
            .setParameter("ids", ids).resultList.stream().collect(
                Collectors.toMap({
                    it[0] as UUID
                }, { it[1] as Long }),
            )
    }
}
