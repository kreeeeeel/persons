package com.persons.person.transformer

import com.persons.person.contract.dto.PersonSummary
import com.persons.person.dao.entity.PersonEntity
import java.util.stream.Collectors

fun PersonEntity.toSummary(): PersonSummary = PersonSummary(
    id, tag,
    listOf(lastName, firstName, patronymic.orEmpty()).stream().filter { it.isNotBlank() }
        .collect(Collectors.joining(" ")),
    avatarMediaId,
)
