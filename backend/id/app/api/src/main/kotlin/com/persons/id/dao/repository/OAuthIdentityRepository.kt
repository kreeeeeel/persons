package com.persons.id.dao.repository

import com.persons.id.dao.entity.OAuthIdentityEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface OAuthIdentityRepository : JpaRepository<OAuthIdentityEntity, UUID> {
    fun findByProviderAndSubject(provider: String, subject: String): OAuthIdentityEntity?
}
