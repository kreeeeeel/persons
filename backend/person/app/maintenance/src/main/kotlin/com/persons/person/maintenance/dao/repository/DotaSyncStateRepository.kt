package com.persons.person.maintenance.dao.repository

import com.persons.person.maintenance.dao.entity.DotaSyncEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface DotaSyncStateRepository :
    JpaRepository<DotaSyncEntity, UUID>,
    JpaSpecificationExecutor<DotaSyncEntity>
