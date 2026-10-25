package com.persons.person.maintenance.dao.repository

import com.persons.person.dao.entity.RatingEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface RatingRecordRepository :
    JpaRepository<RatingEntity, UUID>,
    JpaSpecificationExecutor<RatingEntity>
