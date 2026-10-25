package com.persons.dynamicproperties

import com.persons.dynamicproperties.component.DynPropertyRegistry
import com.persons.dynamicproperties.component.DynPropertyRuntime
import com.persons.dynamicproperties.domain.DynType
import com.persons.dynamicproperties.exception.DynPropertyException
import com.persons.dynamicproperties.storage.MemoryDynPropertyBackend
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.context.ApplicationEventPublisher

class DynPropertyMemoryTest {
    private val events = ApplicationEventPublisher { }

    @Test
    fun `discovers private fields bootstraps once and updates application memory through notifications`() {
        val registry = DynPropertyRegistry()
        val fixture = DynPropertyFixture()
        registry.postProcessAfterInitialization(fixture, "fixture")
        val backend = org.mockito.Mockito.spy(MemoryDynPropertyBackend())
        val runtime = DynPropertyRuntime(registry, backend, events, "test-application")
        runtime.afterSingletonsInstantiated()
        assertThat(fixture.enabled()).isTrue()
        org.mockito.Mockito.clearInvocations(backend)
        java.util.stream.IntStream
            .range(0, 100)
            .forEach { assertThat(fixture.enabled()).isTrue() }
        org.mockito.Mockito.verifyNoInteractions(backend)
        backend.update("test.enabled", "false", backend.snapshot().single { it.definition.key == "test.enabled" }.revision, "admin")
        assertThat(fixture.enabled()).isFalse()
        backend.update("test.rollout", "100", backend.snapshot().single { it.definition.key == "test.rollout" }.revision, "admin")
        assertThat(fixture.rollout().enabledFor("example")).isTrue()
        runtime.close()
    }

    @Test
    fun `reconciles type and default changes but preserves an override for a description change`() {
        val backend = MemoryDynPropertyBackend()
        val initial =
            DynPropertyFactory
                .createInteger("test.value", 10, 0, 100)
                .description("Before")
                .build()
                .definition
        backend.reconcile("application", listOf(initial))
        backend.update(initial.key, "40", 0, "admin")
        backend.reconcile("application", listOf(initial.copy(description = "After")))
        assertThat(backend.snapshot().single().value).isEqualTo("40")
        backend.reconcile("application", listOf(initial.copy(defaultValue = "20")))
        assertThat(backend.snapshot().single().value).isEqualTo("20")
        val changed = DynPropertyFactory.createString("test.value", "new type").build().definition
        backend.reconcile("application", listOf(changed))
        assertThat(
            backend
                .snapshot()
                .single()
                .definition.type,
        ).isEqualTo(DynType.STRING)
        assertThat(backend.snapshot().single().value).isEqualTo("\"new type\"")
    }

    @Test
    fun `removes obsolete declarations only after the last owning application removes them`() {
        val backend = MemoryDynPropertyBackend()
        val definition = DynPropertyFactory.createBoolean("shared.value", true).build().definition
        backend.reconcile("api", listOf(definition))
        backend.reconcile("worker", listOf(definition))
        backend.reconcile("api", emptyList())
        assertThat(backend.snapshot()).hasSize(1)
        backend.reconcile("worker", emptyList())
        assertThat(backend.snapshot()).isEmpty()
    }

    @Test
    fun `validates type ranges timestamps and optimistic revisions without coercion`() {
        val backend = MemoryDynPropertyBackend()
        backend.reconcile("application", listOf(DynPropertyFactory.createInteger("test.interval", 300, 60, 86400).build().definition))
        listOf("\"300\"", "59", "86401", "true", "300 400").stream().forEach { value ->
            assertThatThrownBy { backend.update("test.interval", value, null, "admin") }
                .isInstanceOf(DynPropertyException::class.java)
        }
        backend.update("test.interval", "60", 0, "admin")
        assertThatThrownBy { backend.update("test.interval", "120", 0, "admin") }
            .isInstanceOf(DynPropertyException::class.java)
        assertThatThrownBy {
            DynSchema.validate(DynPropertyFactory.createInstant("test.date", java.time.Instant.EPOCH).build().definition, "\"yesterday\"")
        }.isInstanceOf(DynPropertyException::class.java)
        assertThat(Rollout(0).enabledFor("example")).isFalse()
        assertThat(Rollout(100).enabledFor("example")).isTrue()
        assertThat(Rollout(30).enabledFor("example")).isEqualTo(Rollout(30).enabledFor("example"))
    }
}
