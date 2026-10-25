package com.persons.person.maintenance.dao.repository

import com.persons.person.maintenance.dao.entity.MediaQualityEntity
import com.persons.person.maintenance.dao.entity.MediaQualityId
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface MediaQualityRepository :
    JpaRepository<MediaQualityEntity, MediaQualityId>,
    JpaSpecificationExecutor<MediaQualityEntity> {
    fun findByMediaIdOrderByHeightDesc(mediaId: UUID): List<MediaQualityEntity>
    fun deleteByMediaId(mediaId: UUID)
}
