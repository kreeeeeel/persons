package com.persons.personworker

import jakarta.persistence.EntityManager
import jakarta.persistence.LockModeType
import org.springframework.stereotype.Component
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.support.TransactionTemplate

@Component
class JpaTestData(private val entities: EntityManager, manager: PlatformTransactionManager) {
    private val transactions = TransactionTemplate(manager)

    fun <T : Any> save(value: T): T {
        val saved = transactions.execute {
            val saved = entities.merge(value)
            entities.flush()
            saved
        }
        if (saved == null) {
            throw IllegalStateException("Saving a test entity returned no result")
        }
        return saved
    }

    fun <T : Any> all(type: Class<T>): List<T> {
        val result = transactions.execute {
            val query = entities.criteriaBuilder.createQuery(type)
            query.select(query.from(type))
            entities.createQuery(query).resultList
        }
        if (result == null) {
            throw IllegalStateException("Reading test entities returned no result")
        }
        return result
    }

    fun <T : Any> update(type: Class<T>, predicate: (T) -> Boolean, change: (T) -> Unit) {
        transactions.executeWithoutResult {
            all(type).stream().filter(predicate).forEach(change)
            entities.flush()
        }
    }

    fun <T : Any> delete(type: Class<T>, predicate: (T) -> Boolean = { true }) {
        transactions.executeWithoutResult {
            all(type).stream().filter(predicate).forEach(entities::remove)
            entities.flush()
        }
    }

    fun <T : Any> lock(type: Class<T>, id: Any): T {
        val entity = entities.find(type, id, LockModeType.PESSIMISTIC_WRITE)
        if (entity == null) {
            throw IllegalStateException("Test entity to lock does not exist")
        }
        return entity
    }
}
