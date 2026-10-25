package com.persons.dynamicproperties

import com.persons.dynamicproperties.component.DynPropertyRegistry
import com.persons.dynamicproperties.component.DynPropertyRuntime
import com.persons.dynamicproperties.component.DynPropertyService
import com.persons.dynamicproperties.controller.DynPropertiesController
import com.persons.dynamicproperties.controller.DynPropertyExceptionHandler
import com.persons.dynamicproperties.security.DynPropertyAuthorizer
import com.persons.dynamicproperties.storage.MemoryDynPropertyBackend
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.context.ApplicationEventPublisher
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.server.ResponseStatusException

class DynPropertiesControllerTest {
    private val registry = DynPropertyRegistry()
    private val backend = MemoryDynPropertyBackend()
    private val events = ApplicationEventPublisher { }
    private val service = DynPropertyService(registry, backend, events)
    private val access = Mockito.mock(DynPropertyAuthorizer::class.java)
    private val mvc =
        MockMvcBuilders
            .standaloneSetup(DynPropertiesController(service, access))
            .setControllerAdvice(DynPropertyExceptionHandler())
            .build()

    @Test
    fun `public values exclude private configuration and admin operations require authorization`() {
        registry.register(DynPropertyFactory.createBoolean("test.public", true).publicValue().build())
        registry.register(DynPropertyFactory.createBoolean("test.private", true).build())
        val runtime = DynPropertyRuntime(registry, backend, events, "api")
        try {
            runtime.afterSingletonsInstantiated()
            mvc
                .perform(get("/v1/dynamic-properties/public"))
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].key").value("test.public"))
            Mockito.doThrow(ResponseStatusException(HttpStatus.UNAUTHORIZED)).`when`(access).administrator()
            mvc.perform(get("/v1/admin/variables")).andExpect(status().isUnauthorized)
            Mockito.doThrow(ResponseStatusException(HttpStatus.FORBIDDEN)).`when`(access).administrator()
            mvc
                .perform(
                    put("/v1/admin/variables/test.public")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""{"value":"false"}"""),
                ).andExpect(status().isForbidden)
        } finally {
            runtime.close()
        }
    }

    @Test
    fun `frontend registration cannot change backend keys or register private values`() {
        Mockito.`when`(access.service()).thenReturn("frontend")
        val backendKey = """[{"key":"publication.enabled","type":"BOOLEAN","defaultValue":"true",
            "description":"Test","publicValue":true,"schema":"{\"type\":\"boolean\"}"}]"""
        mvc
            .perform(
                put("/v1/dynamic-properties/registrations/frontend-person")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(backendKey),
            ).andExpect(status().isBadRequest)
        val privateKey =
            backendKey
                .replace("publication.enabled", "frontend.enabled")
                .replace("\"publicValue\":true", "\"publicValue\":false")
        mvc
            .perform(
                put("/v1/dynamic-properties/registrations/frontend-person")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(privateKey),
            ).andExpect(status().isBadRequest)
    }

    @Test
    fun `invalid frontend schemas fail with a client error before registration`() {
        Mockito.`when`(access.service()).thenReturn("frontend")
        listOf("{", "[]", "{} {}", "{\"type\":\"boolean\",\"type\":\"string\"}").stream().forEach { schema ->
            val payload =
                DynJson.mapper.writeValueAsString(
                    listOf(
                        mapOf(
                            "key" to "frontend.enabled",
                            "type" to "BOOLEAN",
                            "defaultValue" to "true",
                            "description" to "Test",
                            "publicValue" to true,
                            "schema" to schema,
                        ),
                    ),
                )
            mvc
                .perform(
                    put("/v1/dynamic-properties/registrations/frontend-person")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload),
                ).andExpect(status().isBadRequest)
        }
        mvc.perform(get("/v1/dynamic-properties/public")).andExpect(jsonPath("$.length()").value(0))
    }
}
