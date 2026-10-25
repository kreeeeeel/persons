package com.persons.person.maintenance.dao.repository

import com.persons.person.maintenance.dao.entity.CsMatchEntity
import com.persons.person.maintenance.dao.entity.CsMatchId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface CsMatchRepository :
    JpaRepository<CsMatchEntity, CsMatchId>,
    JpaSpecificationExecutor<CsMatchEntity> {
    @EntityGraph(attributePaths = ["person"])
    override fun findAll(spec: Specification<CsMatchEntity>?, pageable: Pageable): Page<CsMatchEntity>
    fun deleteByPersonId(personId: UUID)
}
