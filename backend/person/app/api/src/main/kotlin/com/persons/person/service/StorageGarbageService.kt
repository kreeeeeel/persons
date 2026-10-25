package com.persons.person.service

import com.persons.person.dao.entity.StorageGarbageEntity
import com.persons.person.dao.repository.StorageGarbageRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

@Service
class StorageGarbageService(private val garbage: StorageGarbageRepository, private val clock: Clock) {
    @Transactional
    fun stage(key: String) {
        garbage.save(StorageGarbageEntity(objectKey = key, createdAt = clock.instant()))
    }

    @Transactional
    fun attach(key: String, previous: String? = null) {
        garbage.byKey(key)?.let { garbage.delete(it) }
        if (previous != null && previous != key) {
            retire(previous)
        }
    }

    @Transactional
    fun retire(key: String) {
        val now = clock.instant()
        val row = garbage.byKey(key) ?: StorageGarbageEntity(objectKey = key, createdAt = now)
        row.retiredAt = now
        garbage.save(row)
    }
}
