package com.persons.person.maintenance.dao.repository

import com.persons.person.maintenance.dao.entity.DotaMatchEntity
import com.persons.person.maintenance.dao.entity.DotaMatchId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor

interface DotaMatchRepository :
    JpaRepository<DotaMatchEntity, DotaMatchId>,
    JpaSpecificationExecutor<DotaMatchEntity> {
    @EntityGraph(attributePaths = ["person"])
    override fun findAll(spec: Specification<DotaMatchEntity>?, pageable: Pageable): Page<DotaMatchEntity>
}
