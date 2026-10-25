package com.persons.restrictions.service.impl

import com.persons.restrictions.dao.entity.PolicyLockEntity
import com.persons.restrictions.dao.repository.PolicyLockRepository
import com.persons.restrictions.service.PolicyLockStore
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

private const val LOCK_ID: Short = 1

@Service
class PolicyLockStoreImpl(private val repository: PolicyLockRepository) : PolicyLockStore {
    @Transactional
    override fun initialize() {
        if (!repository.existsById(LOCK_ID)) repository.saveAndFlush(PolicyLockEntity(LOCK_ID))
    }

    @Transactional(readOnly = true)
    override fun exists(): Boolean = repository.existsById(LOCK_ID)
}
