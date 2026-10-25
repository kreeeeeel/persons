package com.persons.person

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.component.AccountProfiles
import com.persons.person.component.ActorResolver
import com.persons.person.component.PersonMediaStore
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.ProfileInput
import com.persons.person.contract.dto.PublicationSettings
import com.persons.person.contract.dto.RatingOptionInput
import com.persons.person.contract.dto.UserModerationSettings
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.MediaStatus
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.UnauthorizedException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.util.Base64
import java.util.UUID

@SpringBootTest(
    properties = ["spring.datasource.url=jdbc:h2:mem:publication-http;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"],
)
@AutoConfigureMockMvc
@ActiveProfiles("tests")
class PublicationFlowIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var mapper: ObjectMapper

    @Autowired private lateinit var requests: ModerationRepository

    @Autowired private lateinit var media: MediaRepository

    @MockitoBean private lateinit var actors: ActorResolver

    @MockitoBean private lateinit var store: PersonMediaStore

    @MockitoBean private lateinit var accounts: AccountProfiles

    private val administrator = Actor(UUID.randomUUID(), "Модератор", true)
    private val author = Actor(UUID.randomUUID(), "Автор", false)
    private var current: Actor? = administrator

    @BeforeEach
    fun authenticate() {
        `when`(actors.optional()).thenAnswer { current }
        `when`(actors.required()).thenAnswer { current ?: throw UnauthorizedException() }
        `when`(actors.administrator()).thenAnswer {
            val actor = current ?: throw UnauthorizedException()
            if (!actor.administrator) throw ForbiddenException()
            actor
        }
    }

    @Test
    fun `disabled media checks apply to committed HTTP uploads and public galleries`() {
        val personId = createPerson()
        configure(false, false)
        val photo = upload(personId, "PHOTO")
        val moment = upload(personId, "MOMENT")

        assertThat(photo.status.name).isEqualTo("APPROVED")
        assertThat(moment.status.name).isEqualTo("APPROVED")
        assertThat(media.findById(requests.findById(photo.id).orElseThrow().targetId).orElseThrow().status)
            .isEqualTo(MediaStatus.PUBLISHED)
        assertThat(media.findById(requests.findById(moment.id).orElseThrow().targetId).orElseThrow().status)
            .isEqualTo(MediaStatus.PUBLISHED)
        current = null
        mvc.perform(get("/v1/persons/$personId/photos"))
            .andExpect(status().isOk).andExpect(jsonPath("$.items[0].moderationStatus").value("APPROVED"))
        mvc.perform(get("/v1/persons/$personId/moments"))
            .andExpect(status().isOk).andExpect(jsonPath("$.items[0].moderationStatus").value("APPROVED"))
    }

    @Test
    fun `changing policy affects new uploads and preserves pending reviews and user overrides`() {
        val personId = createPerson()
        configure(false, true)
        val pending = upload(personId, "MOMENT")
        assertThat(pending.status.name).isEqualTo("PENDING")
        configure(false, false)
        assertThat(upload(personId, "MOMENT").status.name).isEqualTo("APPROVED")
        assertThat(requests.findById(pending.id).orElseThrow().status.name).isEqualTo("PENDING")
        current = administrator
        mvc.perform(put("/v1/admin/users/${author.id}/moderation-settings").json(UserModerationSettings(true)))
            .andExpect(status().isOk)
        assertThat(upload(personId, "PHOTO").status.name).isEqualTo("PENDING")
    }

    @Test
    fun `QuickTime upload preserves its type and schedules compatible encodings`() {
        val personId = createPerson()
        configure(false, false)
        current = author
        val bytes = byteArrayOf(0, 0, 0, 16) + "ftypqt  ".toByteArray() + byteArrayOf(0, 0, 0, 0)
        val response = mvc.perform(
            multipart("/v1/persons/$personId/media")
                .file(MockMultipartFile("file", "clip.mov", "video/quicktime", bytes)).param("kind", "MOMENT"),
        )
            .andExpect(status().isAccepted).andExpect(jsonPath("$.status").value("APPROVED"))
            .andReturn().response.contentAsString
        val receipt = mapper.readValue(response, ModerationReceipt::class.java)
        val fileId = requests.findById(receipt.id).orElseThrow().targetId
        assertThat(media.findById(fileId).orElseThrow().contentType).isEqualTo("video/quicktime")
        mvc.perform(get("/v1/media/$fileId/qualities")).andExpect(status().isOk)
            .andExpect(jsonPath("$.processing").value(true))
    }

    private fun createPerson(): UUID {
        current = administrator
        val tag = "flow-${UUID.randomUUID().toString().take(8)}"
        val input = ProfileInput(
            tag, "Тест", "Публикации", "", emptyList(), emptyList(),
            listOf(RatingOptionInput("🔥", "Огонь"), RatingOptionInput("🤝", "Свой")), 0,
        )
        val response = mvc.perform(post("/v1/persons").json(input)).andExpect(status().isAccepted)
            .andReturn().response.contentAsString
        return requests.findById(mapper.readValue(response, ModerationReceipt::class.java).id).orElseThrow().personId
    }

    private fun configure(photos: Boolean, moments: Boolean) {
        current = administrator
        mvc.perform(put("/v1/admin/publication-settings").json(PublicationSettings(false, photos, moments)))
            .andExpect(status().isOk)
    }

    private fun upload(personId: UUID, kind: String): ModerationReceipt {
        current = author
        val bytes = if (kind == "PHOTO") {
            Base64.getDecoder().decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6lk0AAAAASUVORK5CYII=",
            )
        } else {
            byteArrayOf(0, 0, 0, 16, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0)
        }
        val response = mvc.perform(
            multipart("/v1/persons/$personId/media")
                .file(MockMultipartFile("file", "upload", "application/octet-stream", bytes))
                .param("kind", kind).param("caption", "Проверка публикации"),
        ).andExpect(status().isAccepted).andReturn().response.contentAsString
        return mapper.readValue(response, ModerationReceipt::class.java)
    }

    private fun MockHttpServletRequestBuilder.json(value: Any) =
        contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(value))
}
