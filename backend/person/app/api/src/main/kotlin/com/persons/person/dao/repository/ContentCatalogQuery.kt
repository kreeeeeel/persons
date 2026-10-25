package com.persons.person.dao.repository

import com.persons.person.dao.entity.PersonEntity
import jakarta.persistence.Tuple
import jakarta.persistence.criteria.Expression
import org.hibernate.query.criteria.JpaCriteriaQuery
import org.hibernate.query.criteria.JpaDerivedRoot
import org.hibernate.query.criteria.JpaRoot

data class ContentCatalogQuery(
    val query: JpaCriteriaQuery<Tuple>,
    val source: JpaDerivedRoot<Tuple>,
    val person: JpaRoot<PersonEntity>,
    val status: Expression<String>,
    val personName: Expression<String>,
)
