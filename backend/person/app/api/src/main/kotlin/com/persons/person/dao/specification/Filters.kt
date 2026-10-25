package com.persons.person.dao.specification

import org.springframework.data.jpa.domain.Specification
import java.util.Arrays

fun <T> matching(vararg filters: Pair<String, Any?>): Specification<T> = Specification { row, _, builder ->
    val predicates = Arrays.stream(filters).map { (field, value) ->
        if (value == null) builder.isNull(row.get<Any>(field)) else builder.equal(row.get<Any>(field), value)
    }.toList().toTypedArray()

    builder.and(*predicates)
}
