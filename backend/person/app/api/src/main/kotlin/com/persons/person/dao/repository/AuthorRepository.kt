package com.persons.person.dao.repository

import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.entity.ContentLikeEntity
import com.persons.person.dao.entity.CreditEntryEntity
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.MediaReactionEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.RatingEntity
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class AuthorRepository(private val entityManager: EntityManager) {
    fun participates(id: UUID): Boolean {
        val builder = entityManager.criteriaBuilder
        val query = builder.createQuery(Boolean::class.javaObjectType)
        val sources = listOf(
            Triple(PersonEntity::class.java, "ownerAccountId", true),
            Triple(
                CommentEntity::class.java,
                "authorId",
                true,
            ),
            Triple(
                CreditEntryEntity::class.java,
                "authorId",
                true,
            ),

            Triple(RatingEntity::class.java, "userId", false), Triple(MediaEntity::class.java, "uploaderId", false),
            Triple(
                ContentLikeEntity::class.java,
                "userId",
                false,
            ),
            Triple(
                MediaReactionEntity::class.java,
                "userId",
                false,
            ),

        )
        val membership = sources.stream().map { (type, field, visible) ->
            val existing = query.subquery(UUID::class.java)
            val row = existing.from(type)
            val author = builder.equal(row.get<UUID>(field), id)
            existing.select(row.get("id")).where(
                if (visible) {
                    builder.and(
                        author,
                        builder.isFalse(row.get("deleted")),
                    )
                } else {
                    author
                },
            )
            builder.exists(existing)
        }.toList()
        query.select(builder.or(*membership.toTypedArray()))
        return entityManager.createQuery(query).singleResult
    }
}
