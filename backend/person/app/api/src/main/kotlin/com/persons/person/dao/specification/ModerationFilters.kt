package com.persons.person.dao.specification

import com.persons.person.contract.dto.ModerationContentType
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.MediaKind
import com.persons.person.domain.ModerationFilter
import com.persons.person.exception.impl.InvalidInputException
import jakarta.persistence.criteria.Predicate
import org.springframework.data.jpa.domain.Specification
import java.util.Locale
import java.util.UUID

fun moderationMatching(filter: ModerationFilter): Specification<ModerationEntity> = Specification {
        row,
        query,
        builder,
    ->
    val predicates = mutableListOf<Predicate>()
    filter.status?.let { predicates.add(builder.equal(row.get<Any>("status"), it)) }
    filter.authorId?.let { predicates.add(builder.equal(row.get<UUID>("authorId"), it)) }
    filter.personId?.let { predicates.add(builder.equal(row.get<UUID>("personId"), it)) }
    filter.createdFrom?.let { predicates.add(builder.greaterThanOrEqualTo(row.get("createdAt"), it)) }
    filter.createdTo?.let { predicates.add(builder.lessThan(row.get("createdAt"), it)) }

    if (filter.query.isNotBlank()) {
        val pattern = "%${filter.query.trim().lowercase(Locale.ROOT)
            .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")}%"
        val people = query?.subquery(UUID::class.java) ?: throw InvalidInputException()
        val person = people.from(PersonEntity::class.java)
        val name = builder.concat(builder.concat(person.get<String>("lastName"), " "), person.get<String>("firstName"))
        val fullName = builder.concat(builder.concat(name, " "), builder.coalesce(person.get<String>("patronymic"), ""))
        people.select(person.get("id")).where(
            builder.equal(person.get<UUID>("id"), row.get<UUID>("personId")),
            builder.or(
                builder.like(builder.lower(fullName), pattern, '\\'),
                builder.like(builder.lower(person.get("tag")), pattern, '\\'),
            ),
        )
        predicates.add(
            builder.or(
                builder.like(builder.lower(row.get("authorName")), pattern, '\\'),
                builder.like(builder.lower(row.get("summary")), pattern, '\\'),
                builder.like(builder.lower(row.get("personTag")), pattern, '\\'),
                builder.like(builder.lower(row.get("payload")), pattern, '\\'),
                builder.exists(people),
            ),
        )
    }

    val kinds = when (filter.type) {
        ModerationContentType.PERSON -> listOf(
            ChangeKind.CREATE_PERSON, ChangeKind.UPDATE_PERSON, ChangeKind.DELETE_PERSON,
        )
        ModerationContentType.COMMENT -> listOf(
            ChangeKind.CREATE_COMMENT, ChangeKind.UPDATE_COMMENT, ChangeKind.DELETE_COMMENT,
            ChangeKind.UPDATE_RATING_COMMENT,
            ChangeKind.DELETE_RATING,
        )
        ModerationContentType.CREDIT -> listOf(
            ChangeKind.CREATE_CREDIT, ChangeKind.UPDATE_CREDIT, ChangeKind.DELETE_CREDIT,
        )
        ModerationContentType.OWNERSHIP -> listOf(ChangeKind.LINK_ACCOUNT, ChangeKind.CLAIM_OWNERSHIP)
        ModerationContentType.PHOTO, ModerationContentType.MOMENT, ModerationContentType.AVATAR ->
            listOf(ChangeKind.PUBLISH_MEDIA, ChangeKind.UPDATE_MEDIA, ChangeKind.DELETE_MEDIA)
        null -> emptyList()
    }
    if (kinds.isNotEmpty()) predicates.add(row.get<ChangeKind>("kind").`in`(kinds))
    val mediaKind = when (filter.type) {
        ModerationContentType.PHOTO -> MediaKind.PHOTO
        ModerationContentType.MOMENT -> MediaKind.MOMENT
        ModerationContentType.AVATAR -> MediaKind.AVATAR
        else -> null
    }
    if (mediaKind != null) {
        val files = query?.subquery(UUID::class.java) ?: throw InvalidInputException()
        val file = files.from(MediaEntity::class.java)
        files.select(file.get("id")).where(
            builder.equal(file.get<UUID>("id"), row.get<UUID>("targetId")),
            builder.equal(file.get<MediaKind>("kind"), mediaKind),
        )
        predicates.add(builder.exists(files))
    }
    builder.and(*predicates.toTypedArray())
}

fun automaticallyApproved(): Specification<ModerationEntity> = Specification { row, _, builder ->
    builder.isNull(row.get<UUID>("reviewedBy"))
}
