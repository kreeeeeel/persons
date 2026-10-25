package com.persons.i18n.domain

data class CatalogSnapshot(
    val locale: String,
    val namespace: String,
    val version: String,
    val messages: Map<String, String>,
)
