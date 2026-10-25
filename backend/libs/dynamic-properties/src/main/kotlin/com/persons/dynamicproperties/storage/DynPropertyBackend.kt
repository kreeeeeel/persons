package com.persons.dynamicproperties.storage

import com.persons.dynamicproperties.domain.DynChange
import com.persons.dynamicproperties.domain.DynRecord
import com.persons.dynamicproperties.domain.DynSpec

interface DynPropertyBackend {
    fun reconcile(
        scope: String,
        definitions: List<DynSpec>,
    ): List<DynRecord>

    fun snapshot(): List<DynRecord>

    fun snapshotChange(): DynChange

    fun update(
        key: String,
        value: String,
        revision: Long?,
        actor: String,
    ): DynRecord

    fun subscribe(listener: (DynChange) -> Unit): AutoCloseable
}
