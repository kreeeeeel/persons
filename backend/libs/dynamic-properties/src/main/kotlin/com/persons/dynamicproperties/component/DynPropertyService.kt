package com.persons.dynamicproperties.component

import com.persons.dynamicproperties.DynSchema
import com.persons.dynamicproperties.contract.dto.DynDefinitionInput
import com.persons.dynamicproperties.contract.dto.DynamicProperty
import com.persons.dynamicproperties.contract.dto.PropertyType
import com.persons.dynamicproperties.domain.DynChange
import com.persons.dynamicproperties.domain.DynSpec
import com.persons.dynamicproperties.domain.DynType
import com.persons.dynamicproperties.storage.DynPropertyBackend
import org.springframework.context.ApplicationEventPublisher
import java.time.ZoneOffset

class DynPropertyService(
    private val registry: DynPropertyRegistry,
    private val backend: DynPropertyBackend,
    private val events: ApplicationEventPublisher,
) {
    fun current(publicOnly: Boolean = false): List<DynamicProperty> =
        registry
            .snapshot()
            .stream()
            .filter { !publicOnly || it.definition.publicValue }
            .sorted(compareBy { it.definition.key })
            .map { record ->
                DynamicProperty(
                    key = record.definition.key,
                    type = PropertyType.valueOf(record.definition.type.name),
                    value = record.value,
                    revision = record.revision,
                    defaultValue = record.definition.defaultValue,
                    description = record.definition.description,
                    publicValue = record.definition.publicValue,
                    updatedAt = record.updatedAt.atOffset(ZoneOffset.UTC),
                )
            }.toList()

    fun update(
        key: String,
        value: String,
        revision: Long?,
        actor: String,
    ): DynamicProperty {
        val record = backend.update(key, value, revision, actor)
        registry.apply(DynChange(listOf(record)), events)
        return current()
            .stream()
            .filter { it.key == key }
            .findFirst()
            .orElseThrow()
    }

    fun register(
        scope: String,
        definitions: List<DynDefinitionInput>,
    ): List<DynamicProperty> {
        if (definitions.stream().anyMatch { !it.key.startsWith("frontend.") || !it.publicValue }) {
            throw com.persons.dynamicproperties.exception
                .DynPropertyException("INVALID_DECLARATION")
        }
        val specs =
            definitions
                .stream()
                .map {
                    DynSpec(
                        it.key,
                        DynType.valueOf(it.type.name),
                        it.defaultValue,
                        it.description,
                        it.publicValue,
                        DynSchema.parseSchema(it.schema),
                    )
                }.toList()
        backend.reconcile(scope, specs)
        registry.apply(backend.snapshotChange(), events)
        return current(true)
    }
}
