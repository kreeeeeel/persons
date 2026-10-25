package com.persons.dynamicproperties.component

import com.persons.dynamicproperties.storage.DynPropertyBackend
import jakarta.annotation.PreDestroy
import org.springframework.beans.factory.SmartInitializingSingleton
import org.springframework.context.ApplicationEventPublisher

class DynPropertyRuntime(
    private val registry: DynPropertyRegistry,
    private val backend: DynPropertyBackend,
    private val events: ApplicationEventPublisher,
    private val scope: String,
) : SmartInitializingSingleton {
    private var subscription: AutoCloseable? = null

    override fun afterSingletonsInstantiated() {
        subscription = backend.subscribe { registry.apply(it, events) }
        backend.reconcile(scope, registry.definitions())
        registry.apply(backend.snapshotChange(), events)
    }

    @PreDestroy
    fun close() {
        subscription?.close()
    }
}
