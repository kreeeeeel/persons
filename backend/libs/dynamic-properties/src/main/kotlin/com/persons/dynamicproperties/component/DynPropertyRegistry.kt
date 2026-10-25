package com.persons.dynamicproperties.component

import com.persons.dynamicproperties.DynProperty
import com.persons.dynamicproperties.domain.DynChange
import com.persons.dynamicproperties.domain.DynRecord
import com.persons.dynamicproperties.domain.DynSpec
import com.persons.dynamicproperties.domain.PropertiesChanged
import com.persons.dynamicproperties.exception.DynPropertyException
import org.springframework.aop.framework.AopProxyUtils
import org.springframework.beans.factory.config.BeanPostProcessor
import org.springframework.context.ApplicationEventPublisher
import org.springframework.util.ReflectionUtils
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

class DynPropertyRegistry : BeanPostProcessor {
    private val declarations = ConcurrentHashMap<String, CopyOnWriteArrayList<DynProperty<*>>>()
    private val records = ConcurrentHashMap<String, DynRecord>()
    private val removedRevisions = mutableMapOf<String, Long>()
    private var snapshotRevision = -1L

    fun snapshot(): List<DynRecord> = records.values.toList()

    override fun postProcessAfterInitialization(
        bean: Any,
        beanName: String,
    ): Any {
        val target = AopProxyUtils.getSingletonTarget(bean) ?: bean
        ReflectionUtils.doWithFields(target.javaClass, { field ->
            if (DynProperty::class.java.isAssignableFrom(field.type)) {
                ReflectionUtils.makeAccessible(field)
                val property = ReflectionUtils.getField(field, target) as? DynProperty<*>
                if (property != null) register(property)
            }
        })
        return bean
    }

    fun register(property: DynProperty<*>) {
        declarations.compute(property.definition.key) { _, existing ->
            if (existing != null && existing.first().definition != property.definition) {
                throw DynPropertyException("CONFLICTING_DECLARATION")
            }
            val result = existing ?: CopyOnWriteArrayList()
            result.add(property)
            result
        }
    }

    fun definitions(): List<DynSpec> =
        declarations.values
            .stream()
            .map { it.first().definition }
            .toList()

    @Synchronized
    fun apply(
        change: DynChange,
        events: ApplicationEventPublisher,
    ) {
        if (change.fullSnapshot && change.revision < snapshotRevision) return
        val changed = mutableSetOf<String>()
        val removed = change.removed.toMutableSet()
        if (change.fullSnapshot) {
            val incoming =
                change.records
                    .stream()
                    .map { it.definition.key }
                    .toList()
                    .toSet()
            removed.addAll(records.keys.minus(incoming))
        }
        change.records.stream().forEach { record ->
            val current = records[record.definition.key]
            val afterSnapshot = change.fullSnapshot || record.revision > snapshotRevision
            val afterRemoval = record.revision > (removedRevisions[record.definition.key] ?: -1L)
            if (afterSnapshot && afterRemoval && (current == null || record.revision > current.revision)) {
                records[record.definition.key] = record
                declarations[record.definition.key]?.stream()?.forEach { it.apply(record) }
                changed.add(record.definition.key)
            }
        }
        removed.stream().forEach { key ->
            val current = records[key]
            if (change.revision > snapshotRevision && change.revision >= (current?.revision ?: -1L)) {
                records.remove(key)
                removedRevisions[key] = change.revision
                declarations[key]?.stream()?.forEach { it.reset() }
                changed.add(key)
            }
        }
        if (change.fullSnapshot) {
            snapshotRevision = change.revision
            removedRevisions.entries.removeIf { it.value <= snapshotRevision }
        }
        if (changed.isNotEmpty()) events.publishEvent(PropertiesChanged(changed))
    }
}
