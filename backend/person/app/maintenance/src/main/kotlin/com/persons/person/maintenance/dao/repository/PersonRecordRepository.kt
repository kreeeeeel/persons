package com.persons.person.maintenance.dao.repository

import com.persons.person.dao.entity.PersonEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface PersonRecordRepository :
    JpaRepository<PersonEntity, UUID>,
    JpaSpecificationExecutor<PersonEntity>
