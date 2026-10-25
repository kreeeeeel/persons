package com.persons.person.maintenance.dao.repository

import com.persons.person.dao.entity.CreditEntryEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface CreditEntryRecordRepository :
    JpaRepository<CreditEntryEntity, UUID>,
    JpaSpecificationExecutor<CreditEntryEntity>
