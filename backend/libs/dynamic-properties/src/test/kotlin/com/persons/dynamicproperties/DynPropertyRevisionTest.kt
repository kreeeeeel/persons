package com.persons.dynamicproperties

import com.persons.dynamicproperties.component.DynPropertyRegistry
import com.persons.dynamicproperties.domain.DynChange
import com.persons.dynamicproperties.storage.MemoryDynPropertyBackend
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.context.ApplicationEventPublisher

class DynPropertyRevisionTest {
    private val events = ApplicationEventPublisher { }

    @Test
    fun `stale snapshots and removal events cannot delete a newer recreated property`() {
        val property = DynPropertyFactory.createBoolean("test.enabled", true).build()
        val backend = MemoryDynPropertyBackend()
        val registry = DynPropertyRegistry()
        registry.register(property)
        backend.reconcile("application", listOf(property.definition))
        val initial = backend.snapshotChange()
        val previous = backend.update("test.enabled", "false", null, "admin")
        backend.reconcile("application", emptyList())
        val deleted = backend.snapshotChange()
        backend.reconcile("application", listOf(property.definition))
        val recreated = backend.update("test.enabled", "false", null, "admin")
        registry.apply(initial, events)
        registry.apply(DynChange(listOf(recreated)), events)
        registry.apply(deleted, events)
        registry.apply(DynChange(removed = setOf("test.enabled"), revision = deleted.revision), events)
        registry.apply(initial, events)
        registry.apply(DynChange(listOf(previous)), events)
        assertThat(property.value).isFalse()
        assertThat(registry.snapshot().single().revision).isEqualTo(recreated.revision)
    }

    @Test
    fun `an empty reconnect snapshot resets deleted handles and rejects delayed value events`() {
        val property = DynPropertyFactory.createBoolean("test.enabled", true).build()
        val backend = MemoryDynPropertyBackend()
        val registry = DynPropertyRegistry()
        registry.register(property)
        backend.reconcile("application", listOf(property.definition))
        val stale = backend.update("test.enabled", "false", null, "admin")
        registry.apply(backend.snapshotChange(), events)
        assertThat(property.value).isFalse()
        backend.reconcile("application", emptyList())
        registry.apply(backend.snapshotChange(), events)
        registry.apply(DynChange(listOf(stale)), events)
        assertThat(property.value).isTrue()
        assertThat(registry.snapshot()).isEmpty()
    }
}
