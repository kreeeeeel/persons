package com.persons.i18n.dao.repository

import com.persons.i18n.dao.entity.TranslationEntity
import com.persons.i18n.dao.entity.TranslationKeyEntity
import jakarta.persistence.EntityManager
import org.springframework.data.jpa.repository.support.SimpleJpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

private const val KEY_ID_FIELD = "keyId"
private const val ID_FIELD = "id"
private const val LOCALE_FIELD = "locale"
private const val NAMESPACE_FIELD = "namespace"

@Repository
class TranslationRepository(private val entityManager: EntityManager) :
    SimpleJpaRepository<TranslationEntity, UUID>(TranslationEntity::class.java, entityManager) {
    fun findCatalog(locale: String, namespace: String): List<TranslationEntity> {
        val builder = entityManager.criteriaBuilder
        val criteria = builder.createQuery(TranslationEntity::class.java)
        val row = criteria.from(TranslationEntity::class.java)
        val key = criteria.from(TranslationKeyEntity::class.java)

        criteria.select(row).where(
            builder.and(
                builder.equal(row.get<Any>(KEY_ID_FIELD), key.get<UUID>(ID_FIELD)),
                builder.equal(row.get<Any>(LOCALE_FIELD), locale),
                builder.equal(key.get<String>(NAMESPACE_FIELD), namespace),
            ),
        )

        val query = entityManager.createQuery(criteria)

        return query.resultList
    }
}
