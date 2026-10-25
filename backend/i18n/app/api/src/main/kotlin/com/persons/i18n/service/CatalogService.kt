package com.persons.i18n.service

import com.persons.i18n.domain.CatalogSnapshot

interface CatalogService {
    fun get(locale: String, namespace: String): CatalogSnapshot
    fun upsert(locale: String, namespace: String, messages: Map<String, String>): CatalogSnapshot
}
