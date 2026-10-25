package com.persons.i18n.controller

import com.persons.i18n.contract.api.V1Api
import com.persons.i18n.contract.dto.Catalog
import com.persons.i18n.service.CatalogService
import org.springframework.http.CacheControl
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.time.Duration

private const val OF_MINUTES = 1L

@RestController
class CatalogController(private val service: CatalogService) : V1Api {
    override fun getCatalog(locale: String, namespace: String): ResponseEntity<Catalog> {
        val snapshot = service.get(locale, namespace)

        return ResponseEntity.ok().eTag("\"${snapshot.version}\"")
            .cacheControl(CacheControl.maxAge(Duration.ofMinutes(OF_MINUTES)))
            .body(Catalog(snapshot.locale, snapshot.namespace, snapshot.version, snapshot.messages))
    }
}
