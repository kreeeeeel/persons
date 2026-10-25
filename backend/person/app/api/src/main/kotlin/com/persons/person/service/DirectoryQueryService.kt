package com.persons.person.service

import com.persons.person.contract.dto.DirectoryEntry
import com.persons.person.contract.dto.DirectoryOrder
import com.persons.person.contract.dto.DirectoryPage
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.ProfileViewEntity
import com.persons.person.dao.entity.RatingEntity
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class DirectoryQueryService(private val entityManager: EntityManager) {
    @Transactional(readOnly = true)
    fun page(page: Int, size: Int, order: DirectoryOrder): DirectoryPage {
        val builder = entityManager.criteriaBuilder
        val query = builder.createTupleQuery()
        val person = query.from(PersonEntity::class.java)
        val views = query.subquery(Long::class.javaObjectType)
        val view = views.from(ProfileViewEntity::class.java)
        views.select(builder.count(view)).where(builder.equal(view.get<UUID>("personId"), person.get<UUID>("id")))
        val photos = query.subquery(Long::class.javaObjectType)
        val photo = photos.from(MediaEntity::class.java)
        photos.select(builder.count(photo)).where(
            builder.equal(photo.get<UUID>("personId"), person.get<UUID>("id")),
            builder.equal(photo.get<MediaKind>("kind"), MediaKind.PHOTO),
            builder.equal(photo.get<MediaStatus>("status"), MediaStatus.PUBLISHED),
        )
        val moments = query.subquery(Long::class.javaObjectType)
        val moment = moments.from(MediaEntity::class.java)
        moments.select(builder.count(moment)).where(
            builder.equal(moment.get<UUID>("personId"), person.get<UUID>("id")),
            builder.equal(moment.get<MediaKind>("kind"), MediaKind.MOMENT),
            builder.equal(moment.get<MediaStatus>("status"), MediaStatus.PUBLISHED),
        )
        val ratings = query.subquery(Double::class.javaObjectType)
        val rating = ratings.from(RatingEntity::class.java)
        ratings.select(builder.avg(rating.get("value")))
            .where(builder.equal(rating.get<UUID>("personId"), person.get<UUID>("id")))
        val name = builder.trim(
            builder.concat(
                builder.concat(builder.concat(person.get("lastName"), " "), person.get("firstName")),
                builder.concat(" ", builder.coalesce(person.get<String>("patronymic"), "")),
            ),
        )
        query.multiselect(
            person.get<UUID>("id").alias("id"), person.get<String>("tag").alias("tag"), name.alias("name"),
            person.get<UUID>("avatarMediaId").alias("avatar"), views.alias("views"), photos.alias("photos"),
            moments.alias("moments"), ratings.alias("rating"),
        ).where(builder.isTrue(person.get("published")), builder.isFalse(person.get("deleted")))
        val first = when (order) {
            DirectoryOrder.VIEWS -> builder.desc(views)
            DirectoryOrder.RATING -> builder.desc(builder.coalesce(ratings, 0.0))
            DirectoryOrder.NEWEST -> builder.desc(person.get<Instant>("createdAt"))
            DirectoryOrder.NAME -> builder.asc(builder.lower(name))
        }
        query.orderBy(first, builder.asc(person.get<String>("tag")), builder.asc(person.get<UUID>("id")))
        val count = builder.createQuery(Long::class.javaObjectType)
        val counted = count.from(PersonEntity::class.java)
        count.select(builder.count(counted))
            .where(builder.isTrue(counted.get("published")), builder.isFalse(counted.get("deleted")))
        return DirectoryPage(
            entityManager.createQuery(query).setFirstResult(page * size).setMaxResults(size).resultList.stream()
                .map {
                    DirectoryEntry(
                        it.get("id", UUID::class.java), it.get("tag", String::class.java),
                        it.get("name", String::class.java),
                        it.get("views", Long::class.javaObjectType), it.get("photos", Long::class.javaObjectType),
                        it.get("moments", Long::class.javaObjectType), it.get("avatar", UUID::class.java),
                        it.get("rating", Double::class.javaObjectType),
                    )
                }.toList(),
            entityManager.createQuery(count).singleResult, page, size,
        )
    }
}
