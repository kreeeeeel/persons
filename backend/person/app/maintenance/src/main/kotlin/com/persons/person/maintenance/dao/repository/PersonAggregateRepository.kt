package com.persons.person.maintenance.dao.repository

import com.persons.person.maintenance.dao.entity.PersonAggregateEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface PersonAggregateRepository :
    JpaRepository<PersonAggregateEntity, UUID>,
    JpaSpecificationExecutor<PersonAggregateEntity>
