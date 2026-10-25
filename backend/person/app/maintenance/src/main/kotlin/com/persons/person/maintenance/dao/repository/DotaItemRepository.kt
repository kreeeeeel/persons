package com.persons.person.maintenance.dao.repository

import com.persons.person.maintenance.dao.entity.DotaItemEntity
import com.persons.person.maintenance.dao.entity.DotaItemId
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface DotaItemRepository :
    JpaRepository<DotaItemEntity, DotaItemId>,
    JpaSpecificationExecutor<DotaItemEntity> {
    fun deleteByPersonId(personId: UUID)
}
