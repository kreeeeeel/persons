package com.persons.id.dao.specification

import com.persons.id.dao.entity.AccountEntity
import org.springframework.data.jpa.domain.Specification

private const val LIKE_ESCAPE = '\\'

fun accountSearch(search: String?): Specification<AccountEntity> = Specification { row, _, builder ->
    val value = search.orEmpty().trim().lowercase()

    if (value.isBlank()) {
        builder.conjunction()
    } else {
        val escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        val pattern = "%$escaped%"

        builder.or(
            builder.like(builder.lower(row.get("email")), pattern, LIKE_ESCAPE),
            builder.like(builder.lower(row.get("firstName")), pattern, LIKE_ESCAPE),
            builder.like(builder.lower(row.get("lastName")), pattern, LIKE_ESCAPE),
        )
    }
}
