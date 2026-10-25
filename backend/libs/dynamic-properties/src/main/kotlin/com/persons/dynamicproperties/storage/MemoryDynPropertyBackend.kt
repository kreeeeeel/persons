package com.persons.dynamicproperties.storage

import com.persons.dynamicproperties.DynSchema
import com.persons.dynamicproperties.domain.DynChange
import com.persons.dynamicproperties.domain.DynRecord
import com.persons.dynamicproperties.domain.DynSpec
import com.persons.dynamicproperties.exception.DynPropertyException
import java.time.Instant
import java.util.concurrent.CopyOnWriteArrayList

class MemoryDynPropertyBackend : DynPropertyBackend {
    private val records = mutableMapOf<String, DynRecord>()
    private val owners = mutableMapOf<String, Set<String>>()
    private val listeners = CopyOnWriteArrayList<(DynChange) -> Unit>()
    private var revisionCounter = -1L

    @Synchronized
    override fun reconcile(
        scope: String,
        definitions: List<DynSpec>,
    ): List<DynRecord> {
        definitions.stream().forEach { DynSchema.validate(it, it.defaultValue) }
        val keys =
            definitions
                .stream()
                .map { it.key }
                .toList()
                .toSet()
        val old = owners[scope].orEmpty()
        owners[scope] = keys
        val removed =
            old
                .minus(keys)
                .stream()
                .filter { key -> owners.values.stream().noneMatch { key in it } }
                .toList()
                .toSet()
        removed.stream().forEach { records.remove(it) }
        if (removed.isNotEmpty()) ++revisionCounter
        val updated =
            definitions
                .stream()
                .map { definition ->
                    val previous = records[definition.key]
                    val reset =
                        previous == null ||
                            previous.definition.type != definition.type ||
                            previous.definition.defaultValue != definition.defaultValue ||
                            previous.definition.schema != definition.schema
                    val changed = previous == null || previous.definition != definition
                    val record =
                        DynRecord(
                            definition,
                            if (reset) definition.defaultValue else previous?.value ?: definition.defaultValue,
                            if (changed) ++revisionCounter else previous.revision,
                            if (changed) Instant.now() else previous?.updatedAt ?: Instant.now(),
                            previous?.updatedBy,
                        )
                    records[definition.key] = record
                    record
                }.toList()
        publish(DynChange(updated, removed, revision = revisionCounter))
        return snapshot()
    }

    @Synchronized
    override fun snapshot(): List<DynRecord> = records.values.toList()

    @Synchronized
    override fun snapshotChange(): DynChange = DynChange(snapshot(), fullSnapshot = true, revision = revisionCounter)

    @Synchronized
    override fun update(
        key: String,
        value: String,
        revision: Long?,
        actor: String,
    ): DynRecord {
        val previous = records[key] ?: throw DynPropertyException("UNKNOWN_KEY")
        if (revision != null && revision != previous.revision) {
            throw DynPropertyException("CONFLICT")
        }
        val normalized = DynSchema.validate(previous.definition, value).toString()
        val updated = previous.copy(value = normalized, revision = ++revisionCounter, updatedAt = Instant.now(), updatedBy = actor)
        records[key] = updated
        publish(DynChange(listOf(updated)))
        return updated
    }

    override fun subscribe(listener: (DynChange) -> Unit): AutoCloseable {
        listeners.add(listener)
        return AutoCloseable { listeners.remove(listener) }
    }

    private fun publish(change: DynChange) {
        listeners.stream().forEach { it(change) }
    }
}
