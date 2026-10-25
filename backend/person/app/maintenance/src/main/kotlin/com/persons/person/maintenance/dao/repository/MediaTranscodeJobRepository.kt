package com.persons.person.maintenance.dao.repository

import com.persons.person.maintenance.dao.entity.MediaTranscodeJobEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface MediaTranscodeJobRepository :
    JpaRepository<MediaTranscodeJobEntity, UUID>,
    JpaSpecificationExecutor<MediaTranscodeJobEntity>
