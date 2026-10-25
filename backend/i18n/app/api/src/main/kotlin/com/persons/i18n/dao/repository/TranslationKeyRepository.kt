package com.persons.i18n.dao.repository

import com.persons.i18n.dao.entity.TranslationKeyEntity
import jakarta.persistence.EntityManager
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

private const val NAMESPACE_FIELD = "namespace"

@Repository
class TranslationKeyRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<TranslationKeyEntity, UUID>(TranslationKeyEntity::class.java, entityManager) {
    fun findByNamespace(namespace: String): List<TranslationKeyEntity> = findAll({ row, _, builder ->
        builder.equal(row.get<Any>(NAMESPACE_FIELD), namespace)
    })
}
