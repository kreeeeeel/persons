package com.persons.person.dao.specification

import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import org.springframework.data.jpa.domain.Specification
import java.util.UUID

fun visibleCommentEvents(): Specification<CommentEntity> = Specification { row, query, builder ->
    val select = requireNotNull(query)
    val personQuery = select.subquery(UUID::class.java)
    val person = personQuery.from(PersonEntity::class.java)
    personQuery.select(person.get("id")).where(
        builder.equal(person.get<UUID>("id"), row.get<UUID>("personId")),
        builder.isTrue(person.get("published")), builder.isFalse(person.get("deleted")),
    )
    val mediaQuery = select.subquery(UUID::class.java)
    val media = mediaQuery.from(MediaEntity::class.java)
    mediaQuery.select(media.get("id")).where(
        builder.equal(media.get<UUID>("id"), builder.coalesce(row.get<UUID>("mediaId"), row.get<UUID>("momentId"))),
        builder.equal(media.get<UUID>("personId"), row.get<UUID>("personId")),
        builder.equal(media.get<MediaStatus>("status"), MediaStatus.PUBLISHED),
        media.get<MediaKind>("kind").`in`(MediaKind.PHOTO, MediaKind.MOMENT),
    )
    builder.and(
        builder.isTrue(row.get("published")), builder.isFalse(row.get("deleted")),
        builder.exists(personQuery), builder.exists(mediaQuery),
    )
}
