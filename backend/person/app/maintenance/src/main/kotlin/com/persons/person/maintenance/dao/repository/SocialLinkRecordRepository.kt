package com.persons.person.maintenance.dao.repository

import com.persons.person.dao.entity.SocialLinkEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface SocialLinkRecordRepository :
    JpaRepository<SocialLinkEntity, UUID>,
    JpaSpecificationExecutor<SocialLinkEntity>
