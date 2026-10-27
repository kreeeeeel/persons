package com.persons.person

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.component.ActorResolver
import com.persons.person.component.PersonMediaStore
import com.persons.person.contract.dto.Decision
import com.persons.person.contract.dto.DecisionInput
import com.persons.person.contract.dto.PersonProfile
import com.persons.person.contract.dto.ProfileInput
import com.persons.person.contract.dto.RatingOptionInput
import com.persons.person.dao.entity.StorageGarbageEntity
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ByteWindow
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.UnauthorizedException
import com.persons.person.maintenance.dao.entity.MediaQualityEntity
import com.persons.person.maintenance.dao.entity.MediaTranscodeJobEntity
import jakarta.persistence.EntityManager
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anyString
import org.mockito.ArgumentMatchers.nullable
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.MediaType
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActions
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.util.UUID
import javax.imageio.ImageIO

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class PersonEvolutionIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var mapper: ObjectMapper

    @Autowired private lateinit var requests: ModerationRepository

    @Autowired private lateinit var media: MediaRepository

    @Autowired private lateinit var fixtures: JpaTestData

    @Autowired private lateinit var entityManager: EntityManager

    @MockitoBean private lateinit var accountProfiles: com.persons.person.component.AccountProfiles

    @MockitoBean private lateinit var actors: ActorResolver

    @MockitoBean private lateinit var profileRestrictions: com.persons.person.component.ProfileRestrictions

    @MockitoBean private lateinit var store: PersonMediaStore

    private val admin = Actor(UUID.randomUUID(), "Администратор", true)
    private val friend = Actor(UUID.randomUUID(), "Автор", false)
    private val other = Actor(UUID.randomUUID(), "Другой", false)
    private var current: Actor? = admin

    @BeforeEach
    fun authenticate() {
        current = admin
        `when`(actors.optional()).thenAnswer { current }
        `when`(actors.required()).thenAnswer { current ?: throw UnauthorizedException() }
        `when`(actors.administrator()).thenAnswer {
            val actor = current ?: throw UnauthorizedException()
            if (!actor.administrator) throw ForbiddenException()
            actor
        }
        `when`(actors.accountId("author@example.test")).thenReturn(friend.id)
        `when`(store.read(anyString(), nullable(ByteWindow::class.java))).thenReturn(ByteArrayResource(png()))
    }

    @Test
    fun `admin person detail resolves current owner and rejects other actors and deleted pages`() {
        val profile = published("admin-owner-detail")
        val route = "/v1/admin/persons/${profile.id}"
        mvc.perform(get(route)).andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(profile.id.toString()))
            .andExpect(jsonPath("$.ownerAccountId").doesNotExist())
        mvc.perform(put("$route/owner").json(mapOf("email" to "author@example.test")))
            .andExpect(status().isAccepted)
        mvc.perform(get(route)).andExpect(status().isOk)
            .andExpect(jsonPath("$.ownerAccountId").value(friend.id.toString()))
        current = friend
        mvc.perform(get(route)).andExpect(status().isForbidden)
        current = null
        mvc.perform(get(route)).andExpect(status().isUnauthorized)
        current = admin
        val removed = json(mvc.perform(delete("/v1/persons/${profile.id}")).andExpect(status().isAccepted))
        approve(UUID.fromString(removed["id"].asText()))
        mvc.perform(get(route)).andExpect(status().isNotFound)
    }

    @Test
    fun `rates from one to five with one replaceable vote and configured emoji`() {
        val profile = published("five-point")
        current = friend
        val body = mapOf("optionId" to profile.ratingOptions.first().id, "value" to 1)
        mvc.perform(put("/v1/persons/${profile.id}/rating").json(body))
            .andExpect(status().isOk).andExpect(jsonPath("$.average").value(0.0))
        current = other
        mvc.perform(put("/v1/persons/${profile.id}/rating").json(body + ("value" to 5)))
            .andExpect(jsonPath("$.average").value(0.0)).andExpect(jsonPath("$.calculationPending").value(true))
        current = friend
        mvc.perform(put("/v1/persons/${profile.id}/rating").json(body + ("value" to 4)))
            .andExpect(jsonPath("$.average").value(0.0)).andExpect(jsonPath("$.value").value(4))
            .andExpect(jsonPath("$.calculationPending").value(true))
        mvc.perform(put("/v1/persons/${profile.id}/rating").json(body + ("value" to 6)))
            .andExpect(status().isBadRequest)
        current = null
        mvc.perform(get("/v1/persons/${profile.id}/rating"))
            .andExpect(jsonPath("$.average").value(0.0))
        mvc.perform(put("/v1/persons/${profile.id}/rating").json(body)).andExpect(status().isUnauthorized)
    }

    @Test
    fun `lists public ratings with arbitrary palette emoji and linked authors without duplicating votes`() {
        val profile = published("public-ratings")
        val link = json(
            mvc.perform(put("/v1/admin/persons/${profile.id}/owner").json(mapOf("email" to "author@example.test")))
                .andExpect(status().isAccepted),
        )
        approve(UUID.fromString(link["id"].asText()))
        current = friend
        val route = "/v1/persons/${profile.id}/rating"
        mvc.perform(put(route).json(mapOf("emoji" to "🐰", "value" to 3)))
            .andExpect(status().isOk).andExpect(jsonPath("$.emoji").value("🐰"))
            .andExpect(jsonPath("$.calculationPending").value(true))
        mvc.perform(put(route).json(mapOf("emoji" to "🚀", "value" to 4)))
            .andExpect(jsonPath("$.total").value(0)).andExpect(jsonPath("$.calculationPending").value(true))
        mvc.perform(put(route).json(mapOf("emoji" to "not-an-emoji", "value" to 4)))
            .andExpect(status().isBadRequest)
        mvc.perform(
            put(route).json(mapOf("optionId" to profile.ratingOptions.first().id, "emoji" to "🚀", "value" to 4)),
        ).andExpect(status().isBadRequest)
        mvc.perform(put(route).json(mapOf("value" to 4))).andExpect(status().isBadRequest)
        current = other
        mvc.perform(put(route).json(mapOf("optionId" to profile.ratingOptions.first().id, "value" to 2)))
            .andExpect(status().isOk)
        current = null
        val feed = "/v1/persons/${profile.id}/ratings"
        mvc.perform(get(feed).param("size", "1"))
            .andExpect(status().isOk).andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.items.length()").value(1))
        mvc.perform(get(feed).param("size", "50"))
            .andExpect(jsonPath("$.items[?(@.emoji == '🚀')].authorTag").value("public-ratings"))
            .andExpect(jsonPath("$.items[?(@.emoji == '🚀')].authorName").value("Автор"))
        mvc.perform(get(feed).param("size", "51")).andExpect(status().isBadRequest)
        current = friend
        mvc.perform(delete(route)).andExpect(jsonPath("$.calculationPending").value(true))
        mvc.perform(get(feed)).andExpect(jsonPath("$.total").value(1))
    }

    @Test
    fun `photo and video reactions are mutually exclusive and idempotent`() {
        val person = published("media-votes")
        val photo = photo(person.id)
        current = friend
        val route = "/v1/media/$photo/reaction"
        mvc.perform(put(route).json(mapOf("reaction" to "LIKE")))
            .andExpect(status().isOk).andExpect(jsonPath("$.likes").value(1))
        mvc.perform(put(route).json(mapOf("reaction" to "LIKE"))).andExpect(jsonPath("$.likes").value(1))
        mvc.perform(put(route).json(mapOf("reaction" to "DISLIKE")))
            .andExpect(jsonPath("$.likes").value(0)).andExpect(jsonPath("$.dislikes").value(1))
        current = other
        mvc.perform(put(route).json(mapOf("reaction" to "LIKE"))).andExpect(jsonPath("$.likes").value(1))
        current = friend
        mvc.perform(delete(route)).andExpect(jsonPath("$.dislikes").value(0)).andExpect(jsonPath("$.likes").value(1))
        current = null
        mvc.perform(put(route).json(mapOf("reaction" to "LIKE"))).andExpect(status().isUnauthorized)
    }

    @Test
    fun `media comments stay separate from wall and expose linked author identity`() {
        val profile = published("comment-author")
        val link = json(
            mvc.perform(
                put("/v1/admin/persons/${profile.id}/owner")
                    .json(mapOf("email" to "author@example.test")),
            ).andExpect(status().isAccepted),
        )
        approve(UUID.fromString(link["id"].asText()))
        val photo = photo(profile.id)
        current = friend
        val comment = json(
            mvc.perform(
                post("/v1/persons/${profile.id}/comments")
                    .json(mapOf("text" to "История на фотографии", "mediaId" to photo)),
            ).andExpect(status().isAccepted),
        )
        mvc.perform(get("/v1/persons/${profile.id}/comments").param("mediaId", photo.toString()))
            .andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.items[0].moderationStatus").value("PENDING"))
        current = other
        mvc.perform(get("/v1/persons/${profile.id}/comments").param("mediaId", photo.toString()))
            .andExpect(jsonPath("$.total").value(0))
        approve(UUID.fromString(comment["id"].asText()))
        current = friend
        mvc.perform(get("/v1/persons/${profile.id}/comments")).andExpect(jsonPath("$.total").value(0))
        mvc.perform(get("/v1/persons/${profile.id}/comments").param("mediaId", photo.toString()))
            .andExpect(jsonPath("$.items[0].authorTag").value(profile.tag))
            .andExpect(jsonPath("$.items[0].authorId").value(friend.id.toString()))
            .andExpect(jsonPath("$.items[0].canEdit").value(true))
    }

    @Test
    fun `caption tags and comment edits require approval and preserve original authors`() {
        val person = published("editable-content")
        val tagged = published("tagged-person")
        val photo = photo(person.id)
        current = other
        mvc.perform(
            put("/v1/media/$photo/details").json(
                mapOf(
                    "caption" to "Недопустимо",
                    "taggedPersonIds" to emptyList<UUID>(),
                ),
            ),
        )
            .andExpect(status().isForbidden)
        current = friend
        val edit = json(
            mvc.perform(
                put("/v1/media/$photo/details")
                    .json(mapOf("caption" to "Новая подпись", "taggedPersonIds" to listOf(tagged.id))),
            ).andExpect(status().isAccepted),
        )
        mvc.perform(get("/v1/media/$photo/details")).andExpect(jsonPath("$.caption").value("Фото"))
        approve(UUID.fromString(edit["id"].asText()))
        mvc.perform(get("/v1/media/$photo/details")).andExpect(jsonPath("$.caption").value("Новая подпись"))
            .andExpect(jsonPath("$.taggedPersons[0].tag").value(tagged.tag))
        val add = json(
            mvc.perform(post("/v1/persons/${person.id}/comments").json(mapOf("text" to "Было")))
                .andExpect(status().isAccepted),
        )
        val commentId = requests.findById(UUID.fromString(add["id"].asText())).orElseThrow().targetId
        approve(UUID.fromString(add["id"].asText()))
        val update = json(
            mvc.perform(put("/v1/comments/$commentId").json(mapOf("text" to "Стало")))
                .andExpect(status().isAccepted),
        )
        mvc.perform(get("/v1/persons/${person.id}/comments")).andExpect(jsonPath("$.items[0].text").value("Стало"))
            .andExpect(jsonPath("$.items[0].moderationStatus").value("PENDING"))
        current = other
        mvc.perform(get("/v1/persons/${person.id}/comments")).andExpect(jsonPath("$.items[0].text").value("Было"))
        approve(UUID.fromString(update["id"].asText()))
        mvc.perform(get("/v1/persons/${person.id}/comments")).andExpect(jsonPath("$.items[0].text").value("Стало"))
            .andExpect(jsonPath("$.items[0].authorName").value(friend.name))
    }

    @Test
    fun `ownership evidence remains private before and after approval and one account owns one page`() {
        val person = published("claim-owner")
        val second = published("claim-second")
        current = friend
        val receipt = json(
            mvc.perform(
                multipart("/v1/persons/${person.id}/ownership-claims")
                    .file(image()).param("message", "Это моя страница, вот подтверждение"),
            ).andExpect(status().isAccepted),
        )
        val requestId = UUID.fromString(receipt["id"].asText())
        val proof = requests.findById(requestId).orElseThrow().targetId
        mvc.perform(get("/v1/persons/by-tag/${person.tag}")).andExpect(jsonPath("$.claimPending").value(true))
        mvc.perform(
            multipart("/v1/persons/${person.id}/ownership-claims").file(image())
                .param("message", "Повторное доказательство владельца"),
        ).andExpect(status().isConflict)
        mvc.perform(get("/v1/media/$proof/content")).andExpect(status().isOk)
        current = other
        mvc.perform(get("/v1/media/$proof/content")).andExpect(status().isNotFound)
        current = null
        mvc.perform(get("/v1/media/$proof/content")).andExpect(status().isNotFound)
        approve(requestId)
        current = friend
        mvc.perform(get("/v1/persons/by-tag/${person.tag}"))
            .andExpect(jsonPath("$.verified").value(true)).andExpect(jsonPath("$.canEdit").value(true))
        mvc.perform(
            multipart("/v1/persons/${second.id}/ownership-claims").file(image())
                .param("message", "Хочу присвоить вторую страницу"),
        ).andExpect(status().isConflict)
        current = null
        mvc.perform(get("/v1/media/$proof/content")).andExpect(status().isNotFound)
        mvc.perform(get("/v1/media/$proof/details")).andExpect(status().isNotFound)
    }

    @Test
    fun `achievement management is administrative and mass grants are idempotent`() {
        val first = published("award-first")
        val second = published("award-second")
        val achievement = json(
            mvc.perform(
                multipart("/v1/admin/achievements").file(image())
                    .param("title", "Душа компании").param("description", "Умеет собрать всех"),
            ).andExpect(status().isCreated),
        )
        val id = achievement["id"].asText()
        assertThat(achievement["type"].asText()).isEqualTo("MANUAL")
        assertThat(achievement["active"].asBoolean()).isTrue()
        val recipients = mapOf("personIds" to listOf(first.id, second.id), "note" to "За общие приключения")
        mvc.perform(post("/v1/admin/achievements/$id/grants").json(recipients))
            .andExpect(jsonPath("$.granted").value(2))
        mvc.perform(post("/v1/admin/achievements/$id/grants").json(recipients))
            .andExpect(jsonPath("$.granted").value(0))
        current = friend
        mvc.perform(get("/v1/admin/achievements")).andExpect(status().isForbidden)
        mvc.perform(post("/v1/admin/achievements/$id/grants").json(recipients)).andExpect(status().isForbidden)
        mvc.perform(get("/v1/persons/${first.id}/achievements"))
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].achievement.title").value("Душа компании"))
        current = admin
        mvc.perform(delete("/v1/admin/achievements/$id/grants/${first.id}")).andExpect(status().isNoContent)
        mvc.perform(get("/v1/persons/${first.id}/achievements")).andExpect(jsonPath("$.total").value(0))
        mvc.perform(delete("/v1/admin/achievements/$id")).andExpect(status().isNoContent)
        entityManager.flush()
        assertThat(
            fixtures.all(StorageGarbageEntity::class.java).stream()
                .filter {
                    it.retiredAt != null &&
                        it.objectKey.startsWith("achievments/")
                }.count(),
        ).isEqualTo(1)
        mvc.perform(get("/v1/admin/achievements")).andExpect(jsonPath("$.total").value(0))
        mvc.perform(get("/v1/achievements/$id/image")).andExpect(status().isNotFound)
        current = null
        mvc.perform(get("/v1/persons/${second.id}/achievements")).andExpect(jsonPath("$.total").value(0))
        mvc.perform(get("/v1/achievements/$id/image")).andExpect(status().isNotFound)
    }

    @Test
    fun `new achievement availability is persisted without a separate update`() {
        val person = published("inactive-award")
        val created = json(
            mvc.perform(
                multipart("/v1/admin/achievements").file(image())
                    .param("title", "Пока недоступно").param("description", "Черновик награды")
                    .param("active", "false"),
            ).andExpect(status().isCreated).andExpect(jsonPath("$.active").value(false)),
        )
        val id = created["id"].asText()
        mvc.perform(post("/v1/admin/achievements/$id/grants").json(mapOf("personIds" to listOf(person.id))))
            .andExpect(status().isConflict)
        mvc.perform(get("/v1/admin/achievements"))
            .andExpect(jsonPath("$.items[0].active").value(false))
    }

    @Test
    fun `automatic achievement rules are persisted and cannot be granted or revoked by hand`() {
        val person = published("automatic-award")
        val created = json(
            mvc.perform(
                multipart("/v1/admin/achievements").file(image())
                    .param("title", "Первый год").param("description", "Годовщина страницы")
                    .param("type", "AUTOMATIC").param("pageAgeYears", "1"),
            ).andExpect(status().isCreated)
                .andExpect(jsonPath("$.type").value("AUTOMATIC"))
                .andExpect(jsonPath("$.pageAgeYears").value(1)),
        )
        val id = created["id"].asText()
        mvc.perform(post("/v1/admin/achievements/$id/grants").json(mapOf("personIds" to listOf(person.id))))
            .andExpect(status().isConflict)
        mvc.perform(delete("/v1/admin/achievements/$id/grants/${person.id}"))
            .andExpect(status().isConflict)

        val unchangedRule = json(
            mvc.perform(
                put("/v1/admin/achievements/$id").json(
                    mapOf(
                        "title" to "Год среди своих", "description" to "Новое описание", "active" to true,
                        "version" to created["version"].asLong(),
                    ),
                ),
            ).andExpect(status().isOk)
                .andExpect(jsonPath("$.type").value("AUTOMATIC"))
                .andExpect(jsonPath("$.pageAgeYears").value(1)),
        )
        mvc.perform(
            put("/v1/admin/achievements/$id").json(
                mapOf(
                    "title" to "Ручной значок", "description" to "По решению администратора", "active" to true,
                    "version" to unchangedRule["version"].asLong(), "type" to "MANUAL",
                ),
            ),
        ).andExpect(status().isOk)
            .andExpect(jsonPath("$.type").value("MANUAL"))
            .andExpect(jsonPath("$.pageAgeYears").doesNotExist())
        mvc.perform(post("/v1/admin/achievements/$id/grants").json(mapOf("personIds" to listOf(person.id))))
            .andExpect(jsonPath("$.granted").value(1))
    }

    @Test
    fun `rejects missing out of range and incompatible automatic achievement rules`() {
        mvc.perform(
            multipart("/v1/admin/achievements").file(image()).param("title", "Некорректное правило")
                .param("description", "").param("type", "AUTOMATIC"),
        ).andExpect(status().isBadRequest)
        mvc.perform(
            multipart("/v1/admin/achievements").file(image()).param("title", "Некорректное правило")
                .param("description", "").param("type", "AUTOMATIC").param("pageAgeYears", "0"),
        ).andExpect(status().isBadRequest)
        mvc.perform(
            multipart("/v1/admin/achievements").file(image()).param("title", "Некорректное правило")
                .param("description", "").param("type", "AUTOMATIC").param("pageAgeYears", "6"),
        ).andExpect(status().isBadRequest)
        mvc.perform(
            multipart("/v1/admin/achievements").file(image()).param("title", "Некорректное правило")
                .param("description", "").param("type", "MANUAL").param("pageAgeYears", "1"),
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `stores video duration and preview without publishing unapproved uploads`() {
        val person = published("video-preview")
        current = friend
        val video =
            MockMultipartFile("file", "moment.mp4", "video/mp4", ByteArray(4) + "ftypisom00000000".toByteArray())
        val receipt = json(
            mvc.perform(
                multipart("/v1/persons/${person.id}/media").file(video).file(image("preview"))
                    .param("kind", "MOMENT").param("caption", "Четыре секунды").param("durationSeconds", "4"),
            )
                .andExpect(status().isAccepted),
        )
        val requestId = UUID.fromString(receipt["id"].asText())
        val id = requests.findById(requestId).orElseThrow().targetId
        current = null
        mvc.perform(get("/v1/media/$id/preview")).andExpect(status().isNotFound)
        approve(requestId)
        current = null
        mvc.perform(get("/v1/media/$id/details")).andExpect(jsonPath("$.durationSeconds").value(4.0))
            .andExpect(jsonPath("$.previewAvailable").value(true))
        mvc.perform(get("/v1/media/$id/preview")).andExpect(status().isOk)
        assertThat(media.findById(id).orElseThrow().previewObjectKey).isNotBlank()
        assertThat(media.findById(id).orElseThrow().objectKey).startsWith("video/")
        assertThat(media.findById(id).orElseThrow().previewObjectKey).startsWith("video/")
    }

    @Test
    fun `manual reputation requires administrator and can return to automatic calculation`() {
        val profile = published("reputation-override")
        current = friend
        mvc.perform(put("/v1/admin/persons/${profile.id}/reputation").json(mapOf("reputation" to "BAD")))
            .andExpect(status().isForbidden)
        current = null
        mvc.perform(put("/v1/admin/persons/${profile.id}/reputation").json(emptyMap<String, String>()))
            .andExpect(status().isUnauthorized)
        current = admin
        mvc.perform(put("/v1/admin/persons/${profile.id}/reputation").json(mapOf("reputation" to "BAD")))
            .andExpect(status().isOk).andExpect(jsonPath("$.stats.reputation").value("BAD"))
            .andExpect(jsonPath("$.reputationOverride").value("BAD"))
        mvc.perform(put("/v1/admin/persons/${profile.id}/reputation").json(emptyMap<String, String>()))
            .andExpect(status().isOk).andExpect(jsonPath("$.stats.reputation").value("UNKNOWN"))
    }

    @Test
    fun `video qualities preserve pending media access rules and support byte ranges`() {
        val profile = published("video-qualities")
        current = friend
        val file = MockMultipartFile("file", "moment.mp4", "video/mp4", ByteArray(4) + "ftypisom00000000".toByteArray())
        val receipt = json(
            mvc.perform(
                multipart("/v1/persons/${profile.id}/media").file(file)
                    .param("kind", "MOMENT").param("durationSeconds", "4"),
            ).andExpect(status().isAccepted),
        )
        val requestId = UUID.fromString(receipt["id"].asText())
        val id = requests.findById(requestId).orElseThrow().targetId
        val jobStatus = fixtures.all(MediaTranscodeJobEntity::class.java).stream()
            .filter {
                it.mediaId == id
            }.toList().singleOrNull()?.status
        assertThat(jobStatus)
            .isEqualTo("QUEUED")
        fixtures.save(
            MediaQualityEntity(
                mediaId = id,
                height = 360,
                width = 640,
                objectKey = "test/360.mp4",
                sizeBytes = 100,
            ),
        )
        mvc.perform(get("/v1/media/$id/qualities")).andExpect(status().isOk)
            .andExpect(jsonPath("$.items[0].height").value(360)).andExpect(jsonPath("$.processing").value(true))
        current = other
        mvc.perform(get("/v1/media/$id/qualities")).andExpect(status().isNotFound)
        mvc.perform(get("/v1/media/$id/qualities/360/content")).andExpect(status().isNotFound)
        approve(requestId)
        current = null
        mvc.perform(get("/v1/media/$id/qualities/360/content").header("Range", "bytes=0-9"))
            .andExpect(status().isPartialContent)
            .andExpect(
                org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                    .string("Content-Range", "bytes 0-9/100"),
            )
        mvc.perform(get("/v1/media/$id/qualities/360/content").header("Range", "bytes=100-110"))
            .andExpect(status().isRequestedRangeNotSatisfiable)
        mvc.perform(get("/v1/media/$id/qualities/720/content")).andExpect(status().isNotFound)
    }

    @Test
    fun `original download includes a safe filename with the actual file extension`() {
        val profile = published("download-name")
        val id = photo(profile.id)
        current = null
        mvc.perform(get("/v1/media/$id/content")).andExpect(status().isOk)
            .andExpect(
                org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                    .string("Content-Disposition", "inline; filename=\"$id.png\""),
            )
    }

    private fun published(tag: String): PersonProfile {
        current = admin
        val receipt = json(
            mvc.perform(
                post("/v1/persons").json(
                    ProfileInput(
                        tag, "Человек", "", "", emptyList(),
                        emptyList(), listOf(RatingOptionInput("💜", "Свой"), RatingOptionInput("🔥", "Огонь")), 0,
                    ),
                ),
            )
                .andExpect(status().isAccepted),
        )
        approve(UUID.fromString(receipt["id"].asText()))
        return mapper.readValue(
            mvc.perform(get("/v1/persons/by-tag/$tag")).andReturn().response.contentAsString,
            PersonProfile::class.java,
        )
    }

    private fun photo(personId: UUID): UUID {
        current = friend
        val receipt = json(
            mvc.perform(
                multipart("/v1/persons/$personId/media").file(image()).param("kind", "PHOTO")
                    .param("caption", "Фото"),
            ).andExpect(status().isAccepted),
        )
        val requestId = UUID.fromString(receipt["id"].asText())
        val target = requests.findById(requestId).orElseThrow().targetId
        approve(requestId)
        return target
    }

    private fun approve(id: UUID) {
        if (requests.findById(id).orElseThrow().status.name == "APPROVED") {
            return
        }
        val previous = current
        current = admin
        try {
            mvc.perform(post("/v1/admin/moderation/$id/decision").json(DecisionInput(Decision.APPROVE)))
                .andExpect(status().isOk)
        } finally {
            current = previous
        }
    }

    private fun png(): ByteArray = ByteArrayOutputStream().use {
        ImageIO.write(BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", it)
        it.toByteArray()
    }
    private fun image(name: String = "file") = MockMultipartFile(name, "proof.png", "image/png", png())
    private fun json(result: ResultActions): JsonNode = mapper.readTree(result.andReturn().response.contentAsString)
    private fun MockHttpServletRequestBuilder.json(value: Any): MockHttpServletRequestBuilder =
        contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(value))
}
