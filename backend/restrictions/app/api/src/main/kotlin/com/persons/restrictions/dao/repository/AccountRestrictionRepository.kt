package com.persons.restrictions.dao.repository

import com.persons.restrictions.dao.entity.AccountRestrictionEntity
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant
import java.util.UUID

interface AccountRestrictionRepository : JpaRepository<AccountRestrictionEntity, UUID> {
    @Query(
        "select r from AccountRestrictionEntity r where r.revoked = false " +
            "and (r.expiresAt is null or r.expiresAt > :now) " +
            "and lower(r.reason) like :query escape '!' and (:userId is null or r.userId = :userId)",
    )
    fun active(
        @Param("now") now: Instant,
        @Param("query") query: String,
        @Param("userId") userId: UUID?,
        pageable: Pageable,
    ): Page<AccountRestrictionEntity>

    @Query("select r.revision from AccountRestrictionEntity r where r.userId = :userId")
    fun revision(@Param("userId") userId: UUID): Long?

    @Query("select distinct r from AccountRestrictionEntity r left join fetch r.scopes where r.userId in :users")
    fun forUsers(@Param("users") users: Collection<UUID>): List<AccountRestrictionEntity>

    @Query(
        "select r from AccountRestrictionEntity r where r.revoked = false and r.expiresAt <= :now " +
            "order by r.expiresAt, r.id",
    )
    fun expired(@Param("now") now: Instant, pageable: Pageable): List<AccountRestrictionEntity>
}
