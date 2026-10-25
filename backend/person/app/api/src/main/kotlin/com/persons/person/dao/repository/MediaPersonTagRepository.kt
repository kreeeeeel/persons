package com.persons.person.dao.repository

import com.persons.person.dao.entity.MediaPersonTagEntity
import com.persons.person.dao.specification.matching
import jakarta.persistence.EntityManager
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class MediaPersonTagRepository(entityManager: EntityManager) :
    SimpleJpaRepository<MediaPersonTagEntity, UUID>(MediaPersonTagEntity::class.java, entityManager) {
    fun byMedia(id: UUID): List<MediaPersonTagEntity> = findAll(matching("mediaId" to id))
}
