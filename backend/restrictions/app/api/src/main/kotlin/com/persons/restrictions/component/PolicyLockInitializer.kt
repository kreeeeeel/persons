package com.persons.restrictions.component

import com.persons.restrictions.service.PolicyLockStore
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Component

@Component
class PolicyLockInitializer(private val store: PolicyLockStore) : ApplicationRunner {
    override fun run(args: ApplicationArguments) {
        try {
            store.initialize()
        } catch (exception: DataIntegrityViolationException) {
            // Another instance may have initialized the singleton in its own transaction.
            if (!store.exists()) throw exception
        }
    }
}
