package com.persons.dynamicproperties.controller

import com.persons.dynamicproperties.component.DynPropertyService
import com.persons.dynamicproperties.contract.api.DynamicPropertiesApi
import com.persons.dynamicproperties.contract.api.VariablesApi
import com.persons.dynamicproperties.contract.dto.DynDefinitionInput
import com.persons.dynamicproperties.contract.dto.DynamicProperty
import com.persons.dynamicproperties.contract.dto.DynamicPropertyUpdate
import com.persons.dynamicproperties.security.DynPropertyAuthorizer
import org.springframework.http.CacheControl
import org.springframework.http.ResponseEntity

@org.springframework.web.bind.annotation.RestController
class DynPropertiesController(
    private val service: DynPropertyService,
    private val access: DynPropertyAuthorizer,
) : VariablesApi,
    DynamicPropertiesApi {
    override fun listVariables(): ResponseEntity<List<DynamicProperty>> {
        access.administrator()
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.current())
    }

    override fun updateVariable(
        key: String,
        dynamicPropertyUpdate: DynamicPropertyUpdate,
    ): ResponseEntity<DynamicProperty> =
        ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(
            service.update(key, dynamicPropertyUpdate.value, dynamicPropertyUpdate.revision, access.administrator()),
        )

    override fun getPublicProperties(): ResponseEntity<List<DynamicProperty>> =
        ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.current(true))

    override fun registerFrontendProperties(
        scope: String,
        dynDefinitionInput: List<DynDefinitionInput>,
    ): ResponseEntity<List<DynamicProperty>> {
        access.service()
        if (!Regex("^frontend-[a-z0-9-]{1,100}$").matches(scope)) {
            throw com.persons.dynamicproperties.exception
                .DynPropertyException("INVALID_SCOPE")
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.register(scope, dynDefinitionInput))
    }
}
