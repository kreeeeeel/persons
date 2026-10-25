package com.persons.id.dao.repository

import com.persons.id.dao.entity.OAuthFlowEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.time.Instant

interface OAuthFlowRepository : JpaRepository<OAuthFlowEntity, String> {
    fun deleteByExpiresAtBefore(now: Instant): Long
}
