package com.persons.person

import com.persons.id.client.generated.model.UserProfile
import com.persons.person.component.AccountProfiles
import com.persons.person.component.ActorResolver
import com.persons.person.component.ProfileRestrictions
import com.persons.person.contract.dto.AccountRestriction
import com.persons.person.contract.dto.PersonPresence
import com.persons.person.contract.dto.ProfileInput
import com.persons.person.contract.dto.RatingOptionInput
import com.persons.person.contract.dto.RestrictionScope
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.Actor
import com.persons.person.exception.impl.UnavailableException
import com.persons.person.service.ProfileService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
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
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class ProfileExtensionsIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var persons: PersonRepository

    @Autowired private lateinit var profiles: ProfileService

    @MockitoBean private lateinit var actors: ActorResolver

    @MockitoBean private lateinit var accounts: AccountProfiles

    @MockitoBean private lateinit var restrictions: ProfileRestrictions
    private val owner = UUID.randomUUID()
    private val administrator = Actor(UUID.randomUUID(), "Admin", true)

    @BeforeEach
    fun setup() {
        `when`(actors.administrator()).thenReturn(administrator)
        `when`(actors.optional()).thenReturn(administrator)
        `when`(accounts.profiles(setOf(owner))).thenReturn(mapOf(owner to UserProfile(owner, "Имя Фамилия", true, 3)))
    }

    @Test
    fun `legacy profile updates preserve presence and an empty presence object clears it`() {
        val person = persons.saveAndFlush(
            PersonEntity(
                tag = "legacy-presence", firstName = "Имя", published = true,
                presenceStatus = "UNRESPONSIVE", presenceSince = LocalDate.of(2026, 1, 1),
            ),
        )
        val input = ProfileInput(
            tag = person.tag, firstName = person.firstName, lastName = "", description = "",
            tags = emptyList(), socialLinks = emptyList(), ratingOptions = listOf(RatingOptionInput("💜", "Свой")),
            version =
            person.version ?: 0,
        )
        profiles.apply(person, input, false)
        persons.flush()
        assertThat(person.presenceStatus).isEqualTo("UNRESPONSIVE")
        profiles.apply(person, input.copy(version = person.version ?: 0, presence = PersonPresence()), false)
        persons.flush()
        assertThat(person.presenceStatus).isNull()
        assertThat(person.presenceSince).isNull()
    }

    @Test
    fun `public profile includes the linked identity presence and one effective restriction`() {
        persons.saveAndFlush(
            PersonEntity(
                tag = "status-profile", firstName = "Имя", published = true,
                ownerAccountId = owner, presenceStatus = "MISSING", presenceSince = LocalDate.of(2026, 1, 1),
            ),
        )
        `when`(restrictions.current(owner)).thenReturn(
            AccountRestriction(
                UUID.randomUUID(), owner,
                listOf(RestrictionScope.COMMENTS, RestrictionScope.MEDIA), "Причина", OffsetDateTime.now(),
            ),
        )
        mvc.perform(get("/v1/persons/by-tag/status-profile"))
            .andExpect(status().isOk).andExpect(jsonPath("$.presence.status").value("MISSING"))
            .andExpect(jsonPath("$.presence.since").value("2026-01-01"))
            .andExpect(jsonPath("$.linkedAccount.fullName").value("Имя Фамилия"))
            .andExpect(jsonPath("$.linkedAccount.avatarUrl").value("/api/person/v1/authors/$owner/avatar?v=3"))
            .andExpect(jsonPath("$.linkedAccount.email").doesNotExist())
            .andExpect(jsonPath("$.restriction.scopes.length()").value(2))
        `when`(restrictions.current(owner)).thenThrow(UnavailableException())
        mvc.perform(get("/v1/persons/by-tag/status-profile")).andExpect(status().isServiceUnavailable)
    }

    @Test
    fun `dictionary normalizes tags rejects duplicates and preserves saved data on validation failure`() {
        val input = """[{"tag":"Dota","descriptions":{"ru":"Игра","en":"Game"}}]"""
        mvc.perform(put("/v1/admin/tag-definitions").contentType(MediaType.APPLICATION_JSON).content(input))
            .andExpect(status().isOk).andExpect(jsonPath("$[0].tag").value("dota"))
        mvc.perform(get("/v1/tag-definitions")).andExpect(status().isOk)
            .andExpect(jsonPath("$[0].descriptions.en").value("Game"))
        val duplicate = """[{"tag":"Dota","descriptions":{"ru":"Один"}},{"tag":"dota","descriptions":{"ru":"Два"}}]"""
        mvc.perform(put("/v1/admin/tag-definitions").contentType(MediaType.APPLICATION_JSON).content(duplicate))
            .andExpect(status().isBadRequest)
        mvc.perform(get("/v1/tag-definitions")).andExpect(jsonPath("$[0].descriptions.ru").value("Игра"))
    }
}
