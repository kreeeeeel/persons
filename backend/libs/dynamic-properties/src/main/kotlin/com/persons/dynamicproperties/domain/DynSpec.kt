package com.persons.dynamicproperties.domain

import com.fasterxml.jackson.databind.JsonNode

data class DynSpec(
    val key: String,
    val type: DynType,
    val defaultValue: String,
    val description: String,
    val publicValue: Boolean,
    val schema: JsonNode,
)
