package com.persons.restrictions.service

import com.persons.restrictions.domain.Administrator
import com.persons.restrictions.domain.Restriction
import com.persons.restrictions.domain.RestrictionChange
import org.springframework.data.domain.Page
import java.util.UUID

interface RestrictionStore {
    fun page(page: Int, size: Int, query: String, userId: UUID?): Page<Restriction>
    fun lockManagement()
    fun revision(userId: UUID): Long?
    fun find(userIds: Collection<UUID>): List<Restriction>
    fun set(userId: UUID, change: RestrictionChange, administrator: Administrator): Restriction
    fun revoke(userId: UUID, administrator: Administrator)
    fun expire(): Int
}
