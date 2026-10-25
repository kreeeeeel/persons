package com.persons.person.maintenance.dao.repository

import com.persons.person.maintenance.dao.entity.RatingOptionTotalEntity
import com.persons.person.maintenance.dao.entity.RatingOptionTotalId
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface RatingOptionTotalRepository :
    JpaRepository<RatingOptionTotalEntity, RatingOptionTotalId>,
    JpaSpecificationExecutor<RatingOptionTotalEntity> {
    fun deleteByPersonId(personId: UUID)
}
