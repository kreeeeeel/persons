package com.persons.person.maintenance.dao.repository

import com.persons.person.dao.entity.MediaEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface MediaRecordRepository :
    JpaRepository<MediaEntity, UUID>,
    JpaSpecificationExecutor<MediaEntity>
