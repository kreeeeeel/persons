package com.persons.person.maintenance.dao.repository

import com.persons.person.maintenance.dao.entity.DotaMatchId
import com.persons.person.maintenance.dao.entity.DotaNeutralItemEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface DotaNeutralItemRepository :
    JpaRepository<DotaNeutralItemEntity, DotaMatchId>,
    JpaSpecificationExecutor<DotaNeutralItemEntity> {
    fun deleteByPersonId(personId: UUID)
}
