package com.persons.person

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.component.ActorResolver
import com.persons.person.contract.dto.Decision
import com.persons.person.contract.dto.DecisionInput
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.PersonProfile
import com.persons.person.contract.dto.ProfileInput
import com.persons.person.contract.dto.RatingOptionInput
import com.persons.person.domain.Actor
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.UnauthorizedException
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class SearchKeywordsIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var mapper: ObjectMapper

    @MockitoBean private lateinit var actors: ActorResolver

    @MockitoBean private lateinit var accountProfiles: com.persons.person.component.AccountProfiles
    private val admin = Actor(UUID.randomUUID(), "Администратор", true)
    private val owner = Actor(UUID.randomUUID(), "Владелец", false)
    private val stranger = Actor(UUID.randomUUID(), "Другой", false)
    private var current: Actor? = admin

    @BeforeEach
    fun authenticate() {
        current = admin
        `when`(actors.optional()).thenAnswer { current }
        `when`(actors.required()).thenAnswer { current ?: throw UnauthorizedException() }
        `when`(actors.administrator()).thenAnswer {
            val actor = current ?: throw UnauthorizedException()
            if (!actor.administrator) {
                throw ForbiddenException()
            }
            actor
        }
    }

    @Test
    fun `search matches normalized aliases without duplicate results or SQL wildcard expansion`() {
        create(
            input("keyword-krel").copy(
                searchKeywords = listOf(" Кирилл ", "КИРИЛЛ", "Кирилл Немтырев", "немтырев", "100% друг"),
            ),
        )
        create(input("keyword-other").copy(searchKeywords = listOf("1000 друг")))
        current = null
        listOf("КИРИЛЛ", " немтырев ", "0%").stream().forEach { query ->
            mvc.perform(get("/v1/persons/search").param("q", query).param("size", "1"))
                .andExpect(status().isOk).andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].tag").value("keyword-krel"))
        }
        mvc.perform(get("/v1/persons/search").param("q", "кирилл").param("size", "1").param("page", "1"))
            .andExpect(jsonPath("$.items.length()").value(0))
        mvc.perform(get("/v1/persons/by-tag/keyword-krel"))
            .andExpect(jsonPath("$.searchKeywords[0]").value("кирилл"))
            .andExpect(jsonPath("$.searchKeywords.length()").value(4))
            .andExpect(jsonPath("$.tags.length()").value(0))
    }

    @Test
    fun `owner keywords remain hidden until profile and edits are approved`() {
        current = owner
        val created = create(input("keyword-owner").copy(searchKeywords = listOf("первоеимя")))
        mvc.perform(get("/v1/persons/search").param("q", "первоеимя")).andExpect(jsonPath("$.total").value(0))
        approve(created)
        val profile = profile("keyword-owner")
        current = owner
        val edit = mapper.readValue(
            update(profile, input(profile.tag, profile.version).copy(searchKeywords = listOf("второеимя")))
                .andExpect(status().isAccepted).andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().response.contentAsString,
            ModerationReceipt::class.java,
        )
        mvc.perform(get("/v1/persons/search").param("q", "второеимя")).andExpect(jsonPath("$.total").value(0))
        mvc.perform(get("/v1/persons/search").param("q", "первоеимя")).andExpect(jsonPath("$.total").value(1))
        approve(edit)
        current = null
        mvc.perform(get("/v1/persons/search").param("q", "второеимя")).andExpect(jsonPath("$.total").value(1))
        mvc.perform(get("/v1/persons/search").param("q", "первоеимя")).andExpect(jsonPath("$.total").value(0))
    }

    @Test
    fun `legacy profile updates preserve keywords while an explicit empty list clears them`() {
        create(input("keyword-edit").copy(searchKeywords = listOf("псевдоним")))
        var profile = profile("keyword-edit")
        current = stranger
        update(profile, input(profile.tag, profile.version).copy(searchKeywords = listOf("чужое")))
            .andExpect(status().isForbidden)
        current = admin
        update(profile, input(profile.tag, profile.version).copy(description = "Обновлено"))
            .andExpect(status().isAccepted)
        profile = profile("keyword-edit")
        mvc.perform(get("/v1/persons/search").param("q", "псевдоним")).andExpect(jsonPath("$.total").value(1))
        update(profile, input(profile.tag, profile.version).copy(searchKeywords = emptyList()))
            .andExpect(status().isAccepted)
        mvc.perform(get("/v1/persons/search").param("q", "псевдоним")).andExpect(jsonPath("$.total").value(0))
        update(profile, input(profile.tag, profile.version).copy(searchKeywords = listOf("устаревшее")))
            .andExpect(status().isConflict)
    }

    @Test
    fun `rejects empty oversized and excessive keywords`() {
        listOf(
            listOf(" "), listOf("x".repeat(81)),
            java.util.stream.IntStream.range(0, 21).mapToObj {
                "alias$it"
            }.toList(),
        )
            .stream().forEach { keywords ->
                mvc.perform(post("/v1/persons").json(input("invalid-keywords").copy(searchKeywords = keywords)))
                    .andExpect(status().isBadRequest)
            }
    }

    private fun create(input: ProfileInput): ModerationReceipt = mapper.readValue(
        mvc.perform(post("/v1/persons").json(input))
            .andExpect(status().isAccepted).andReturn().response.contentAsString,
        ModerationReceipt::class.java,
    )

    private fun approve(receipt: ModerationReceipt) {
        current = admin
        mvc.perform(post("/v1/admin/moderation/${receipt.id}/decision").json(DecisionInput(Decision.APPROVE)))
            .andExpect(status().isOk)
    }

    private fun update(profile: PersonProfile, input: ProfileInput) =
        mvc.perform(put("/v1/persons/${profile.id}").json(input))

    private fun profile(tag: String): PersonProfile = mapper.readValue(
        mvc.perform(get("/v1/persons/by-tag/$tag")).andExpect(status().isOk).andReturn().response.contentAsString,
        PersonProfile::class.java,
    )

    private fun input(tag: String, version: Long = 0) = ProfileInput(
        tag, "Крел", "", "", emptyList(), emptyList(), listOf(RatingOptionInput("💜", "Свой")), version,
    )

    private fun org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder.json(value: Any) =
        contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(value))
}
