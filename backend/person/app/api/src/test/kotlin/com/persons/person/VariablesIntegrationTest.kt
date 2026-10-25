package com.persons.person

import com.persons.dynamicproperties.component.DynPropertyService
import com.persons.dynamicproperties.security.DynPropertyAuthorizer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("tests")
class VariablesIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var properties: DynPropertyService

    @MockitoBean private lateinit var access: DynPropertyAuthorizer

    @AfterEach
    fun restore() {
        val property = properties.current().single { it.key == "legal.supportEmail" }
        properties.update(property.key, property.defaultValue.orEmpty(), null, "test-cleanup")
    }

    @Test
    fun `library controller updates typed application fields and rejects stale revisions`() {
        `when`(access.administrator()).thenReturn("test-admin")
        val property = properties.current().single { it.key == "legal.supportEmail" }
        val input = com.persons.dynamicproperties.DynJson.mapper.writeValueAsString(
            mapOf("value" to "\"privacy@example.test\"", "revision" to property.revision),
        )
        mvc.perform(
            put("/v1/admin/variables/legal.supportEmail")
                .contentType(MediaType.APPLICATION_JSON).content(input),
        )
            .andExpect(status().isOk)
        mvc.perform(get("/v1/site-settings")).andExpect(jsonPath("$.supportEmail").value("privacy@example.test"))
        mvc.perform(
            put("/v1/admin/variables/legal.supportEmail")
                .contentType(MediaType.APPLICATION_JSON).content(input),
        )
            .andExpect(status().isConflict)
        mvc.perform(get("/v1/dynamic-properties/public"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[?(@.key == 'publication.commentsRequireModeration')]").isEmpty)
    }
}
