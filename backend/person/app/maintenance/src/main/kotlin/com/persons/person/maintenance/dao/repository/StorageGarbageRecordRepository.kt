package com.persons.person.maintenance.dao.repository

import com.persons.person.dao.entity.StorageGarbageEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface StorageGarbageRecordRepository :
    JpaRepository<StorageGarbageEntity, UUID>,
    JpaSpecificationExecutor<StorageGarbageEntity> {
    fun existsByObjectKey(objectKey: String): Boolean
    fun deleteByObjectKey(objectKey: String)
}
