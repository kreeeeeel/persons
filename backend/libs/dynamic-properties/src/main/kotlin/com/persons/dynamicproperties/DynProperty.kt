package com.persons.dynamicproperties

import com.fasterxml.jackson.databind.JsonNode
import com.persons.dynamicproperties.domain.DynRecord
import com.persons.dynamicproperties.domain.DynSpec
import com.persons.dynamicproperties.exception.DynPropertyException
import java.util.concurrent.atomic.AtomicReference

class DynProperty<T> internal constructor(
    val definition: DynSpec,
    initialValue: T,
    private val decode: (JsonNode) -> T,
) {
    private val current = AtomicReference(initialValue)

    @Volatile private var revision = -1L
    val value: T get() = current.get()

    fun get(): T = value

    @Synchronized
    internal fun apply(record: DynRecord): Boolean {
        if (record.revision <= revision) {
            return false
        }
        if (record.definition.type != definition.type) {
            throw DynPropertyException("INCOMPATIBLE_TYPE")
        }
        val node = DynSchema.validate(definition, record.value)
        current.set(decode(node))
        revision = record.revision
        return true
    }

    @Synchronized
    internal fun reset() {
        current.set(decode(DynSchema.validate(definition, definition.defaultValue)))
        revision = -1
    }
}
