package com.persons.i18n.controller

import com.persons.i18n.contract.api.InternalApi
import com.persons.i18n.contract.dto.Catalog
import com.persons.i18n.contract.dto.CatalogUpdate
import com.persons.i18n.exception.impl.UnauthorizedException
import com.persons.i18n.service.CatalogService
import com.persons.requestobservability.RequestMetadata
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class CatalogManagementController(
    private val service: CatalogService,
    private val metadata: RequestMetadata,
    private val request: HttpServletRequest,
) : InternalApi {
    override fun upsertCatalog(
        locale: String,
        namespace: String,
        catalogUpdate: CatalogUpdate,
    ): ResponseEntity<Catalog> {
        if (!metadata.trustedService(request)) {
            throw UnauthorizedException()
        }

        val snapshot = service.upsert(locale, namespace, catalogUpdate.messages)

        return ResponseEntity.ok(Catalog(snapshot.locale, snapshot.namespace, snapshot.version, snapshot.messages))
    }
}
