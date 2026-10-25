package com.persons.person.dao.repository

import com.persons.person.dao.entity.StorageGarbageEntity
import com.persons.person.dao.specification.matching
import jakarta.persistence.EntityManager
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

private const val KEY = "objectKey"

@Repository
class StorageGarbageRepository(entityManager: EntityManager) :
    SimpleJpaRepository<StorageGarbageEntity, UUID>(StorageGarbageEntity::class.java, entityManager) {
    fun byKey(key: String): StorageGarbageEntity? = findOne(matching(KEY to key)).orElse(null)
}
