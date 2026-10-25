package com.persons.person.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "person_search_keywords")
class SearchKeywordEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var personId: UUID = UUID.randomUUID(),
    var keyword: String = "",
    var position: Int = 0,
)
