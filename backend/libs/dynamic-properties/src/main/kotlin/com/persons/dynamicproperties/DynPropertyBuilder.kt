package com.persons.dynamicproperties

import com.fasterxml.jackson.databind.JsonNode
import com.persons.dynamicproperties.domain.DynSpec
import com.persons.dynamicproperties.domain.DynType

class DynPropertyBuilder<T> internal constructor(
    private val key: String,
    private val type: DynType,
    private val default: T,
    private val encode: (T) -> String,
    private val decode: (JsonNode) -> T,
    private var schema: JsonNode,
) {
    private var description = ""
    private var publicValue = false

    fun description(value: String): DynPropertyBuilder<T> {
        description = value
        return this
    }

    fun publicValue(): DynPropertyBuilder<T> {
        publicValue = true
        return this
    }

    fun schema(value: JsonNode): DynPropertyBuilder<T> {
        schema = value.deepCopy()
        return this
    }

    fun build(): DynProperty<T> {
        val definition = DynSpec(key, type, encode(default), description, publicValue, schema)
        DynSchema.validate(definition, definition.defaultValue)
        return DynProperty(definition, default, decode)
    }
}
