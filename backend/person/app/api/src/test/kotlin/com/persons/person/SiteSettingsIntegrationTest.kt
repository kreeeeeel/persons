package com.persons.person

import com.persons.dynamicproperties.storage.DynPropertyBackend
import com.persons.person.component.ActorResolver
import com.persons.person.domain.Actor
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.UnauthorizedException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.mockito.Mockito.doThrow
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
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class SiteSettingsIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var settings: DynPropertyBackend

    @MockitoBean private lateinit var actors: ActorResolver

    private val admin = Actor(UUID.randomUUID(), "Administrator", true)

    @Test
    fun `public settings default to enabled without authentication`() {
        mvc.perform(get("/v1/dynamic-properties/public")).andExpect(status().isOk)
        mvc.perform(get("/v1/admin/variables")).andExpect(status().isUnauthorized)
        mvc.perform(get("/v1/site-settings"))
            .andExpect(status().isOk)
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.marqueeEnabled").value(true))
    }

    @Test
    fun `administrator disables and re-enables the ticker for all visitors`() {
        `when`(actors.administrator()).thenReturn(admin)

        mvc.perform(get("/v1/admin/site-settings")).andExpect(status().isOk)
        mvc.perform(
            put("/v1/admin/site-settings").contentType(MediaType.APPLICATION_JSON)
                .content("""{"marqueeEnabled":false}"""),
        ).andExpect(status().isOk).andExpect(jsonPath("$.marqueeEnabled").value(false))
        mvc.perform(get("/v1/site-settings")).andExpect(jsonPath("$.marqueeEnabled").value(false))

        val row = settings.snapshot().single { it.definition.key == "site.marqueeEnabled" }
        assertThat(row.updatedBy).isEqualTo(admin.id.toString())
        assertThat(row.updatedAt).isNotNull()

        mvc.perform(
            put("/v1/admin/site-settings").contentType(MediaType.APPLICATION_JSON)
                .content("""{"marqueeEnabled":true}"""),
        ).andExpect(status().isOk)
        mvc.perform(get("/v1/site-settings")).andExpect(jsonPath("$.marqueeEnabled").value(true))
    }

    @Test
    fun `administrative settings reject anonymous and regular users`() {
        doThrow(UnauthorizedException()).`when`(actors).administrator()
        mvc.perform(get("/v1/admin/site-settings")).andExpect(status().isUnauthorized)
        mvc.perform(
            put("/v1/admin/site-settings").contentType(MediaType.APPLICATION_JSON)
                .content("""{"marqueeEnabled":false}"""),
        ).andExpect(status().isUnauthorized)

        doThrow(ForbiddenException()).`when`(actors).administrator()
        mvc.perform(get("/v1/admin/site-settings")).andExpect(status().isForbidden)
        mvc.perform(
            put("/v1/admin/site-settings").contentType(MediaType.APPLICATION_JSON)
                .content("""{"marqueeEnabled":false}"""),
        ).andExpect(status().isForbidden)
    }

    @Test
    fun `missing visibility is rejected without changing settings`() {
        `when`(actors.administrator()).thenReturn(admin)
        mvc.perform(
            put("/v1/admin/site-settings").contentType(MediaType.APPLICATION_JSON).content("{}"),
        ).andExpect(status().isBadRequest)
        mvc.perform(get("/v1/site-settings")).andExpect(jsonPath("$.marqueeEnabled").value(true))
    }
}
