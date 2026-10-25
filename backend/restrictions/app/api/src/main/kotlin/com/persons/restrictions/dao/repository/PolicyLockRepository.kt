package com.persons.restrictions.dao.repository

import com.persons.restrictions.dao.entity.PolicyLockEntity
import org.springframework.data.jpa.repository.JpaRepository

interface PolicyLockRepository : JpaRepository<PolicyLockEntity, Short>
