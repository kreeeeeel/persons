package com.persons.person.maintenance.dao.repository

import com.persons.person.maintenance.dao.entity.AggregateQueueEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface AggregateQueueRepository :
    JpaRepository<AggregateQueueEntity, UUID>,
    JpaSpecificationExecutor<AggregateQueueEntity>
