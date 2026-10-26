package com.persons.person

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.component.AccountProfiles
import com.persons.person.component.ActorResolver
import com.persons.person.contract.dto.Decision
import com.persons.person.contract.dto.DecisionInput
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.PersonDates
import com.persons.person.contract.dto.PersonProfile
import com.persons.person.contract.dto.ProfileInput
import com.persons.person.contract.dto.RatingOptionInput
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import com.persons.person.exception.impl.UnauthorizedException
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class ProfileGalleryIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var mapper: ObjectMapper

    @Autowired private lateinit var media: MediaRepository

    @Autowired private lateinit var persons: PersonRepository

    @MockitoBean private lateinit var actors: ActorResolver

    @MockitoBean private lateinit var accounts: AccountProfiles

    private val admin = Actor(UUID.randomUUID(), "Admin", true)
    private val owner = Actor(UUID.randomUUID(), "Owner", false)
    private val stranger = Actor(UUID.randomUUID(), "Stranger", false)
    private var current: Actor? = admin

    @BeforeEach
    fun authenticate() {
        current = admin
        `when`(actors.optional()).thenAnswer { current }
        `when`(actors.required()).thenAnswer { current ?: throw UnauthorizedException() }
        `when`(actors.administrator()).thenReturn(admin)
    }

    @Test
    fun `stores calendar dates edits them through moderation and preserves omitted dates`() {
        val initial = input("profile-dates").copy(dates = dates())
        create(initial)
        val profile = profile(initial.tag)
        assertThat(profile.dates).isEqualTo(dates())
        val row = persons.findById(profile.id).orElseThrow()
        row.ownerAccountId = owner.id
        persons.flush()
        val version = profile(initial.tag).version
        current = owner
        val changed = dates().copy(militaryReturnDate = LocalDate.parse("2027-06-02"))
        val receipt = update(profile.id, initial.copy(version = version, dates = changed))
        assertThat(profile(initial.tag).dates).isEqualTo(dates())
        approve(receipt)
        assertThat(profile(initial.tag).dates).isEqualTo(changed)
        current = admin
        update(profile.id, initial.copy(version = profile(initial.tag).version, dates = null))
        assertThat(profile(initial.tag).dates).isEqualTo(changed)
        update(profile.id, initial.copy(version = profile(initial.tag).version, dates = PersonDates()))
        assertThat(profile(initial.tag).dates).isEqualTo(PersonDates())
    }

    @Test
    fun `rejects future birthdays and invalid service date order`() {
        listOf(
            PersonDates(birthDate = LocalDate.parse("2999-01-01")),
            PersonDates(militaryReturnDate = LocalDate.parse("2027-06-01")),
            dates().copy(militaryReturnDate = dates().militaryDepartureDate),
            dates().copy(militaryDepartureDate = LocalDate.parse("1990-01-01")),
        ).stream().forEach { dates ->
            mvc.perform(post("/v1/persons").json(input("invalid-dates").copy(dates = dates)))
                .andExpect(status().isBadRequest)
        }
    }

    @Test
    fun `paginates mixed media in stable order and navigates across kinds without exposing private items`() {
        create(input("mixed-gallery"))
        val person = profile("mixed-gallery")
        val first = add(person.id, 1, MediaKind.PHOTO)
        val second = add(person.id, 2, MediaKind.MOMENT)
        val third = add(person.id, 3, MediaKind.PHOTO)
        val pending = add(person.id, 4, MediaKind.MOMENT, MediaStatus.PENDING)
        add(person.id, 5, MediaKind.PHOTO, MediaStatus.DELETED)
        add(person.id, 6, MediaKind.AVATAR)
        create(input("unrelated-gallery"))
        add(profile("unrelated-gallery").id, 7, MediaKind.PHOTO)
        current = null
        mvc.perform(get("/v1/persons/${person.id}/gallery").param("size", "2"))
            .andExpect(status().isOk).andExpect(jsonPath("$.total").value(3))
            .andExpect(jsonPath("$.items[0].id").value(third.toString()))
            .andExpect(jsonPath("$.items[1].id").value(second.toString()))
            .andExpect(jsonPath("$.items[1].kind").value("MOMENT"))
        mvc.perform(get("/v1/persons/${person.id}/gallery").param("size", "2").param("page", "1"))
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].id").value(first.toString()))
        mvc.perform(get("/v1/media/$second/details").param("mixed", "true"))
            .andExpect(jsonPath("$.previousMediaId").value(third.toString()))
            .andExpect(jsonPath("$.previousMediaKind").value("PHOTO"))
            .andExpect(jsonPath("$.nextMediaId").value(first.toString()))
        mvc.perform(get("/v1/media/$second/details"))
            .andExpect(jsonPath("$.previousMediaId").doesNotExist())
            .andExpect(jsonPath("$.nextMediaId").doesNotExist())
        current = stranger
        mvc.perform(get("/v1/persons/${person.id}/gallery")).andExpect(jsonPath("$.total").value(3))
        current = owner
        mvc.perform(get("/v1/persons/${person.id}/gallery")).andExpect(jsonPath("$.total").value(4))
            .andExpect(jsonPath("$.items[0].id").value(pending.toString()))
        mvc.perform(get("/v1/persons/${person.id}/gallery").param("page", "-1"))
            .andExpect(status().isBadRequest)
        mvc.perform(get("/v1/persons/${person.id}/gallery").param("size", "101"))
            .andExpect(status().isBadRequest)
    }

    private fun add(person: UUID, id: Int, kind: MediaKind, status: MediaStatus = MediaStatus.PUBLISHED): UUID =
        media.saveAndFlush(
            MediaEntity(
                id = UUID(0, id.toLong()), personId = person, uploaderId = owner.id, uploaderName = "Owner",
                kind = kind, status = status, objectKey = "test/$id", contentType = "image/png", caption = "Media $id",
                createdAt = Instant.parse("2026-10-01T00:00:00Z"),
            ),
        ).id

    private fun dates() = PersonDates(
        LocalDate.parse("2001-05-14"), LocalDate.parse("2026-06-01"), LocalDate.parse("2027-06-01"),
    )

    private fun input(tag: String) = ProfileInput(
        tag, "Человек", "", "Описание", emptyList(), emptyList(), listOf(RatingOptionInput("💜", "Свой")), 0,
    )

    private fun create(input: ProfileInput) {
        val result = mvc.perform(post("/v1/persons").json(input)).andExpect(status().isAccepted)
        approve(mapper.readValue(result.andReturn().response.contentAsString, ModerationReceipt::class.java))
    }

    private fun update(id: UUID, input: ProfileInput): ModerationReceipt = mapper.readValue(
        mvc.perform(put("/v1/persons/$id").json(input)).andExpect(status().isAccepted)
            .andReturn().response.contentAsString,
        ModerationReceipt::class.java,
    )

    private fun approve(receipt: ModerationReceipt) {
        if (receipt.status.name == "APPROVED") return
        val previous = current
        current = admin
        mvc.perform(post("/v1/admin/moderation/${receipt.id}/decision").json(DecisionInput(Decision.APPROVE)))
            .andExpect(status().isOk)
        current = previous
    }

    private fun profile(tag: String): PersonProfile = mapper.readValue(
        mvc.perform(get("/v1/persons/by-tag/$tag")).andExpect(status().isOk).andReturn().response.contentAsString,
        PersonProfile::class.java,
    )

    private fun MockHttpServletRequestBuilder.json(value: Any): MockHttpServletRequestBuilder =
        contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(value))
}
