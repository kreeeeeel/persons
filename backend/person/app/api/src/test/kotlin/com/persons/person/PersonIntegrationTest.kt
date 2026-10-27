package com.persons.person

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.component.ActorResolver
import com.persons.person.component.PersonMediaStore
import com.persons.person.contract.dto.CommentInput
import com.persons.person.contract.dto.CreditInput
import com.persons.person.contract.dto.CreditKind
import com.persons.person.contract.dto.Decision
import com.persons.person.contract.dto.DecisionInput
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.OwnerLinkInput
import com.persons.person.contract.dto.PersonProfile
import com.persons.person.contract.dto.ProfileInput
import com.persons.person.contract.dto.PublicationSettings
import com.persons.person.contract.dto.RatingInput
import com.persons.person.contract.dto.RatingOptionInput
import com.persons.person.contract.dto.SocialLink
import com.persons.person.contract.dto.SocialNetwork
import com.persons.person.contract.dto.UserModerationSettings
import com.persons.person.contract.dto.ViewInput
import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ByteWindow
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import com.persons.person.domain.VerifiedUpload
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.UnauthorizedException
import com.persons.person.service.MediaService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID
import java.util.stream.IntStream

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class PersonIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var mapper: ObjectMapper

    @Autowired private lateinit var requests: ModerationRepository

    @Autowired private lateinit var persons: PersonRepository

    @Autowired private lateinit var media: MediaRepository

    @Autowired private lateinit var comments: CommentRepository

    @Autowired private lateinit var mediaService: MediaService

    @MockitoBean private lateinit var accountProfiles: com.persons.person.component.AccountProfiles

    @MockitoBean private lateinit var actors: ActorResolver

    @MockitoBean private lateinit var profileRestrictions: com.persons.person.component.ProfileRestrictions

    @MockitoBean private lateinit var store: PersonMediaStore

    private val admin = Actor(UUID.randomUUID(), "Модератор", true)
    private val owner = Actor(UUID.randomUUID(), "Владелец", false)
    private val friend = Actor(UUID.randomUUID(), "Друг", false)
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
        `when`(actors.accountId("owner@example.test")).thenReturn(owner.id)
    }

    @Test
    fun `administrator creates and edits a published profile immediately with an audit trail`() {
        val created = create("admin-published")
        assertThat(created.status.name).isEqualTo("APPROVED")
        val audit = requests.findById(created.id).orElseThrow()
        assertThat(audit.reviewedBy).isEqualTo(admin.id)
        assertThat(audit.reviewedAt).isNotNull()
        val profile = mapper.readValue(
            mvc.perform(get("/v1/persons/by-tag/admin-published")).andExpect(status().isOk)
                .andReturn().response.contentAsString,
            PersonProfile::class.java,
        )
        mvc.perform(
            put("/v1/persons/${profile.id}").json(input(profile.tag, profile.version).copy(description = "Готово")),
        )
            .andExpect(status().isAccepted).andExpect(jsonPath("$.status").value("APPROVED"))
        current = null
        mvc.perform(get("/v1/persons/by-tag/admin-published")).andExpect(status().isOk)
            .andExpect(jsonPath("$.description").value("Готово"))
    }

    @Test
    fun `administrator deletion closes pending edits with the administrator in their audit trail`() {
        val created = create("admin-removal-audit", owner)
        approve(created)
        persons.flush()
        val person = persons.findById(requests.findById(created.id).orElseThrow().targetId).orElseThrow()
        current = owner
        val edit = receipt(
            mvc.perform(
                put("/v1/persons/${person.id}").json(
                    input(person.tag, person.version ?: 0).copy(description = "На проверке"),
                ),
            ).andExpect(status().isAccepted).andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().response.contentAsString,
        )
        current = admin
        mvc.perform(delete("/v1/persons/${person.id}"))
            .andExpect(status().isAccepted).andExpect(jsonPath("$.status").value("APPROVED"))
        val rejected = requests.findById(edit.id).orElseThrow()
        assertThat(rejected.status.name).isEqualTo("REJECTED")
        assertThat(rejected.reviewedBy).isEqualTo(admin.id)
        assertThat(rejected.reviewedAt).isNotNull()
    }

    @Test
    fun `publication settings are admin only and preserve moderation by default`() {
        mvc.perform(get("/v1/admin/publication-settings")).andExpect(status().isOk)
            .andExpect(jsonPath("$.commentsRequireModeration").value(true))
            .andExpect(jsonPath("$.photosRequireModeration").value(true))
            .andExpect(jsonPath("$.momentsRequireModeration").value(true))
        mvc.perform(get("/v1/admin/users/${friend.id}/moderation-settings")).andExpect(status().isOk)
            .andExpect(jsonPath("$.forceModeration").value(false))
        mvc.perform(put("/v1/admin/publication-settings").json(mapOf("commentsRequireModeration" to false)))
            .andExpect(status().isBadRequest)
        current = friend
        mvc.perform(get("/v1/admin/publication-settings")).andExpect(status().isForbidden)
        mvc.perform(put("/v1/admin/publication-settings").json(PublicationSettings(false, false, false)))
            .andExpect(status().isForbidden)
        mvc.perform(put("/v1/admin/users/${friend.id}/moderation-settings").json(UserModerationSettings(true)))
            .andExpect(status().isForbidden)
        current = null
        mvc.perform(get("/v1/admin/publication-settings")).andExpect(status().isUnauthorized)
    }

    @Test
    fun `automatic comments publish edit and delete immediately while profiles remain moderated`() {
        val person = published("automatic-comments")
        configurePublication(PublicationSettings(false, true, true))
        current = friend
        val created = mvc.perform(post("/v1/persons/${person.id}/comments").json(CommentInput("Сразу видно")))
            .andExpect(status().isAccepted).andExpect(jsonPath("$.status").value("APPROVED"))
            .andReturn().response.contentAsString
        val request = requests.findById(receipt(created).id).orElseThrow()
        assertThat(request.reviewedAt).isNotNull()
        assertThat(request.reviewedBy).isNull()
        current = null
        mvc.perform(get("/v1/persons/${person.id}/comments"))
            .andExpect(jsonPath("$.items[0].text").value("Сразу видно"))
        current = friend
        mvc.perform(put("/v1/comments/${request.targetId}").json(CommentInput("Изменено")))
            .andExpect(status().isAccepted).andExpect(jsonPath("$.status").value("APPROVED"))
        mvc.perform(delete("/v1/comments/${request.targetId}"))
            .andExpect(status().isAccepted).andExpect(jsonPath("$.status").value("APPROVED"))
        current = null
        mvc.perform(get("/v1/persons/${person.id}/comments")).andExpect(jsonPath("$.total").value(0))
        current = friend
        val profile = receipt(
            mvc.perform(post("/v1/persons").json(input("still-moderated")))
                .andExpect(status().isAccepted).andReturn().response.contentAsString,
        )
        assertThat(profile.status.name).isEqualTo("PENDING")
    }

    @Test
    fun `forced user moderation overrides global publishing without affecting others`() {
        val person = published("forced-comments")
        configurePublication(PublicationSettings(false, false, false))
        mvc.perform(put("/v1/admin/users/${friend.id}/moderation-settings").json(UserModerationSettings(true)))
            .andExpect(status().isOk).andExpect(jsonPath("$.forceModeration").value(true))
        current = friend
        mvc.perform(post("/v1/persons/${person.id}/comments").json(CommentInput("На проверке")))
            .andExpect(status().isAccepted).andExpect(jsonPath("$.status").value("PENDING"))
        val photo = mediaService.reserve(person.id, MediaKind.PHOTO, "Фото", VerifiedUpload("image/jpeg", 100), friend)
        assertThat(mediaService.complete(photo.id, friend).status.name).isEqualTo("PENDING")
        current = owner
        mvc.perform(post("/v1/persons/${person.id}/comments").json(CommentInput("Опубликовано")))
            .andExpect(status().isAccepted).andExpect(jsonPath("$.status").value("APPROVED"))
        current = null
        mvc.perform(get("/v1/persons/${person.id}/comments")).andExpect(jsonPath("$.total").value(1))
        current = admin
        mvc.perform(put("/v1/admin/users/${friend.id}/moderation-settings").json(UserModerationSettings(false)))
            .andExpect(status().isOk)
        current = friend
        mvc.perform(post("/v1/persons/${person.id}/comments").json(CommentInput("Теперь сразу")))
            .andExpect(status().isAccepted).andExpect(jsonPath("$.status").value("APPROVED"))
    }

    @Test
    fun `photos and moments have independent publication policies and avatars still require review`() {
        val person = published("media-policies")
        configurePublication(PublicationSettings(true, false, true))
        val photo = mediaService.reserve(person.id, MediaKind.PHOTO, "Фото", VerifiedUpload("image/jpeg", 100), friend)
        val moment = mediaService.reserve(
            person.id, MediaKind.MOMENT, "Видео", VerifiedUpload("video/mp4", 100), friend,
        )
        assertThat(mediaService.complete(photo.id, friend).status.name).isEqualTo("APPROVED")
        assertThat(mediaService.complete(moment.id, friend).status.name).isEqualTo("PENDING")
        assertThat(media.findById(photo.id).orElseThrow().status).isEqualTo(MediaStatus.PUBLISHED)
        configurePublication(PublicationSettings(true, true, false))
        val secondMoment = mediaService.reserve(
            person.id, MediaKind.MOMENT, "Ещё видео", VerifiedUpload("video/mp4", 100), friend,
        )
        assertThat(mediaService.complete(secondMoment.id, friend).status.name).isEqualTo("APPROVED")
        val avatarOwner = persons.findById(person.id).orElseThrow()
        avatarOwner.ownerAccountId = friend.id
        persons.saveAndFlush(avatarOwner)
        val avatar = mediaService.reserve(
            person.id, MediaKind.AVATAR, "Аватар", VerifiedUpload("image/jpeg", 100), friend,
        )
        assertThat(mediaService.complete(avatar.id, friend).status.name).isEqualTo("PENDING")
    }

    private fun configurePublication(settings: PublicationSettings) {
        current = admin
        mvc.perform(put("/v1/admin/publication-settings").json(settings)).andExpect(status().isOk)
    }

    @Test
    fun `text policy covers loans media comments and resubmitted rating reviews`() {
        val person = published("all-text-policies")
        current = friend
        mvc.perform(
            put("/v1/persons/${person.id}/rating")
                .json(RatingInput(person.ratingOptions.first().id, comment = "Первый отзыв")),
        ).andExpect(status().isOk).andExpect(jsonPath("$.commentStatus").value("PENDING"))
        configurePublication(PublicationSettings(false, false, false))
        current = friend
        mvc.perform(
            put("/v1/persons/${person.id}/rating")
                .json(RatingInput(person.ratingOptions.first().id, comment = "Новый отзыв")),
        ).andExpect(status().isOk).andExpect(jsonPath("$.commentStatus").value("APPROVED"))
        mvc.perform(
            post("/v1/persons/${person.id}/credit").json(CreditInput(CreditKind.ON_TIME, "Возвращает вовремя")),
        ).andExpect(status().isAccepted).andExpect(jsonPath("$.status").value("APPROVED"))
        val photo = mediaService.reserve(person.id, MediaKind.PHOTO, "Фото", VerifiedUpload("image/jpeg", 100), friend)
        mediaService.complete(photo.id, friend)
        mvc.perform(
            post("/v1/persons/${person.id}/comments").json(CommentInput("Комментарий к фото", mediaId = photo.id)),
        ).andExpect(status().isAccepted).andExpect(jsonPath("$.status").value("APPROVED"))
        current = null
        mvc.perform(get("/v1/persons/${person.id}/ratings"))
            .andExpect(jsonPath("$.items[0].comment").value("Новый отзыв"))
        mvc.perform(get("/v1/persons/${person.id}/credit")).andExpect(jsonPath("$.total").value(1))
        mvc.perform(get("/v1/persons/by-tag/${person.tag}"))
            .andExpect(jsonPath("$.stats.calculationPending").value(true))
    }

    @Test
    fun `publishes profiles only after approval and supports empty states`() {
        val receipt = create("empty-person", friend)
        assertThat(requests.findById(receipt.id).orElseThrow().status.name).isEqualTo("PENDING")
        current = null
        mvc.perform(
            get("/v1/persons/search")
                .param("q", "Пустой"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(0))
        mvc.perform(get("/v1/persons/by-tag/empty-person")).andExpect(status().isNotFound)
        approve(receipt)
        current = null
        mvc.perform(get("/v1/persons/by-tag/empty-person")).andExpect(status().isOk)
            .andExpect(jsonPath("$.stats.comments").value(0)).andExpect(jsonPath("$.stats.creditScore").value(0))
            .andExpect(jsonPath("$.tags").isEmpty).andExpect(jsonPath("$.canEdit").value(false))
        mvc.perform(get("/v1/persons/search").param("q", "пустой")).andExpect(jsonPath("$.total").value(1))
    }

    @Test
    fun `paginates comments with identical timestamps without repeating or omitting entries`() {
        val person = published("paged-comments")
        val timestamp = Instant.parse("2026-10-18T00:00:00Z")
        comments.saveAllAndFlush(
            IntStream.range(0, 23).mapToObj { index ->
                CommentEntity(
                    personId = person.id, text = "Comment $index", authorName = "Author", createdAt = timestamp,
                )
            }.toList(),
        )
        current = null
        val ids = IntStream.range(0, 3).mapToObj { page ->
            val response = mvc.perform(
                get("/v1/persons/${person.id}/comments").param("page", "$page").param("size", "10"),
            )
                .andExpect(status().isOk).andExpect(jsonPath("$.total").value(23))
                .andReturn().response.contentAsString
            mapper.readTree(response)["items"].toList()
        }.flatMap { it.stream() }.map { it["id"].asText() }.toList()
        assertThat(ids).hasSize(23).doesNotHaveDuplicates()
    }

    @Test
    fun `checks admin role and applies administrator account links immediately`() {
        val profile = published("linked-person")
        current = friend
        mvc.perform(get("/v1/admin/persons")).andExpect(status().isForbidden)
        mvc.perform(
            put("/v1/persons/${profile.id}")
                .json(input(profile.tag, profile.version)),
        )
            .andExpect(status().isForbidden)
        current = admin
        val link =
            receipt(
                mvc.perform(
                    put("/v1/admin/persons/${profile.id}/owner")
                        .json(OwnerLinkInput("owner@example.test")),
                )
                    .andExpect(status().isAccepted)
                    .andReturn().response.contentAsString,
            )
        assertThat(link.status.name).isEqualTo("APPROVED")
        current = owner
        mvc.perform(get("/v1/persons/by-tag/${profile.tag}")).andExpect(jsonPath("$.canEdit").value(true))
    }

    @Test
    fun `moderates comments and sends private approval removal and rejection notifications`() {
        val person = published("comments-person")
        current = friend
        val comment =
            receipt(
                mvc.perform(
                    post("/v1/persons/${person.id}/comments")
                        .json(CommentInput("Наш человек")),
                )
                    .andExpect(status().isAccepted)
                    .andReturn().response.contentAsString,
            )
        mvc.perform(get("/v1/persons/${person.id}/comments")).andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].moderationStatus").value("PENDING"))
        approve(comment)
        current = friend
        val comments = mapper.readTree(
            mvc.perform(get("/v1/persons/${person.id}/comments"))
                .andReturn().response.contentAsString,
        )
        val commentId = comments["items"][0]["id"].asText()
        mvc.perform(get("/v1/notifications")).andExpect(jsonPath("$.items[0].kind").value("APPROVED"))
        current = owner
        mvc.perform(delete("/v1/comments/$commentId")).andExpect(status().isForbidden)
        current = admin
        val removal =
            receipt(
                mvc.perform(delete("/v1/comments/$commentId"))
                    .andExpect(status().isAccepted)
                    .andReturn().response.contentAsString,
            )
        approve(removal)
        current = friend
        mvc.perform(get("/v1/persons/${person.id}/comments")).andExpect(jsonPath("$.total").value(0))
        mvc.perform(get("/v1/notifications")).andExpect(jsonPath("$.items[0].kind").value("REMOVED"))
        mvc.perform(post("/v1/notifications/read")).andExpect(status().isNoContent)
        mvc.perform(get("/v1/notifications")).andExpect(jsonPath("$.unread").value(0))
        current = owner
        mvc.perform(get("/v1/notifications")).andExpect(jsonPath("$.total").value(0))
    }

    @Test
    fun `keeps one configurable emoji rating per account and rejects another persons option`() {
        val first = published("rated-person")
        val second = published("other-person")
        current = friend
        mvc.perform(
            put("/v1/persons/${first.id}/rating")
                .json(RatingInput(second.ratingOptions.first().id)),
        )
            .andExpect(status().isBadRequest)
        mvc.perform(
            put("/v1/persons/${first.id}/rating")
                .json(RatingInput(first.ratingOptions.first().id)),
        )
            .andExpect(status().isOk)
        mvc.perform(
            put("/v1/persons/${first.id}/rating")
                .json(RatingInput(first.ratingOptions.last().id)),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.options[0].count").value(0))
            .andExpect(jsonPath("$.options[1].count").value(0))
            .andExpect(jsonPath("$.calculationPending").value(true))
        mvc.perform(get("/v1/persons/${first.id}/ratings")).andExpect(jsonPath("$.total").value(1))
        mvc.perform(get("/v1/persons/by-tag/${first.tag}"))
            .andExpect(jsonPath("$.stats.ratings").value(0))
            .andExpect(jsonPath("$.stats.calculationPending").value(true))
        mvc.perform(delete("/v1/persons/${first.id}/rating")).andExpect(status().isOk)
        mvc.perform(get("/v1/persons/by-tag/${first.tag}")).andExpect(jsonPath("$.stats.ratings").value(0))
    }

    @Test
    fun `stores joke credit reputation without monetary values and counts daily views once`() {
        val person = published("trusted-person")
        current = friend
        val credit =
            receipt(
                mvc.perform(
                    post("/v1/persons/${person.id}/credit")
                        .json(CreditInput(CreditKind.TRUST, "Вернул пульт на место")),
                )
                    .andExpect(status().isAccepted)
                    .andReturn().response.contentAsString,
            )
        mvc.perform(get("/v1/persons/${person.id}/credit")).andExpect(jsonPath("$.total").value(1))
        approve(credit)
        current = null
        val visitor = ViewInput(UUID.randomUUID())
        mvc.perform(post("/v1/persons/${person.id}/views").json(visitor)).andExpect(status().isNoContent)
        mvc.perform(post("/v1/persons/${person.id}/views").json(visitor)).andExpect(status().isNoContent)
        mvc.perform(get("/v1/persons/by-tag/${person.tag}"))
            .andExpect(jsonPath("$.stats.creditScore").value(0))
            .andExpect(jsonPath("$.stats.calculationPending").value(true))
            .andExpect(jsonPath("$.stats.views").value(1))
    }

    @Test
    fun `gates pending media and supports video ranges and idempotent likes`() {
        val person = published("video-person")
        val other = published("video-other")
        val bytes = byteArrayOf(0, 0, 0, 16, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0)
        current = friend
        mvc.perform(
            multipart("/v1/persons/${person.id}/media")
                .file(MockMultipartFile("file", "video.mp4", "video/mp4", bytes))
                .param("kind", "AVATAR"),
        )
            .andExpect(status().isUnsupportedMediaType)
        val upload =
            receipt(
                mvc.perform(
                    multipart("/v1/persons/${person.id}/media")
                        .file(MockMultipartFile("file", "video.mp4", "video/mp4", bytes))
                        .param("kind", "MOMENT")
                        .param("caption", "Хороший момент"),
                )
                    .andExpect(status().isAccepted).andReturn().response.contentAsString,
            )
        val row = media.findById(requests.findById(upload.id).orElseThrow().targetId).orElseThrow()
        `when`(store.read(row.objectKey, null)).thenReturn(ByteArrayResource(bytes))
        `when`(store.read(row.objectKey, ByteWindow(0, 3))).thenReturn(ByteArrayResource(bytes.copyOfRange(0, 4)))
        current = null
        mvc.perform(get("/v1/media/${row.id}/content")).andExpect(status().isNotFound)
        current = owner
        mvc.perform(get("/v1/media/${row.id}/content")).andExpect(status().isNotFound)
        current = friend
        mvc.perform(get("/v1/media/${row.id}/content")).andExpect(status().isOk)
        approve(upload)
        current = null
        mvc.perform(get("/v1/media/${row.id}/content").header("Range", "bytes=0-3"))
            .andExpect(status().isPartialContent).andExpect(header().string("Content-Range", "bytes 0-3/16"))
        mvc.perform(get("/v1/media/${row.id}/content").header("Range", "bytes=99-"))
            .andExpect(status().isRequestedRangeNotSatisfiable)
        current = friend
        mvc.perform(put("/v1/moments/${row.id}/like")).andExpect(jsonPath("$.count").value(1))
        mvc.perform(put("/v1/moments/${row.id}/like")).andExpect(jsonPath("$.count").value(1))
        mvc.perform(post("/v1/persons/${other.id}/comments").json(CommentInput("Чужой момент", row.id)))
            .andExpect(status().isNotFound)
        mvc.perform(delete("/v1/moments/${row.id}/like")).andExpect(jsonPath("$.count").value(0))
        val removal =
            receipt(
                mvc.perform(delete("/v1/media/${row.id}"))
                    .andExpect(status().isAccepted)
                    .andReturn().response.contentAsString,
            )
        mvc.perform(get("/v1/persons/${person.id}/moments")).andExpect(jsonPath("$.total").value(1))
        approve(removal)
        current = null
        mvc.perform(get("/v1/media/${row.id}/content")).andExpect(status().isNotFound)
        mvc.perform(get("/v1/persons/${person.id}/moments")).andExpect(jsonPath("$.total").value(0))
    }

    @Test
    fun `requires rejection reason and leaves published profile intact`() {
        val person = published("rejected-person")
        current = owner
        val row = persons.findById(person.id).orElseThrow()
        row.ownerAccountId = owner.id
        persons.saveAndFlush(row)
        val update =
            receipt(
                mvc.perform(
                    put("/v1/persons/${person.id}")
                        .json(input(person.tag, row.version ?: 0).copy(description = "Новое описание")),
                )
                    .andExpect(status().isAccepted).andReturn().response.contentAsString,
            )
        current = admin
        mvc.perform(post("/v1/admin/moderation/${update.id}/decision").json(DecisionInput(Decision.REJECT)))
            .andExpect(status().isBadRequest)
        mvc.perform(
            post("/v1/admin/moderation/${update.id}/decision")
                .json(DecisionInput(Decision.REJECT, "Нужно уточнение")),
        )
            .andExpect(status().isOk)
        mvc.perform(get("/v1/persons/by-tag/${person.tag}")).andExpect(jsonPath("$.description").value(""))
        current = owner
        mvc.perform(get("/v1/notifications")).andExpect(jsonPath("$.items[0].kind").value("REJECTED"))
            .andExpect(jsonPath("$.items[0].reason").value("Нужно уточнение"))
        current = admin
        mvc.perform(post("/v1/admin/moderation/${update.id}/decision").json(DecisionInput(Decision.APPROVE)))
            .andExpect(status().isConflict)
    }

    @Test
    fun `Discord tags survive moderation and profile storage without becoming URLs`() {
        val input = input("discord-tag").copy(
            socialLinks = listOf(
                SocialLink(SocialNetwork.DISCORD, tag = "@Some.User_42"),
                SocialLink(SocialNetwork.TELEGRAM, url = "https://t.me/example"),
            ),
        )
        val created = receipt(
            mvc.perform(post("/v1/persons").json(input)).andExpect(status().isAccepted)
                .andReturn().response.contentAsString,
        )
        approve(created)
        current = null
        val result = mapper.readValue(
            mvc.perform(get("/v1/persons/by-tag/discord-tag")).andExpect(status().isOk)
                .andReturn().response.contentAsString,
            PersonProfile::class.java,
        )
        val discord = result.socialLinks.first { it.network == SocialNetwork.DISCORD }
        assertThat(discord.tag).isEqualTo("some.user_42")
        assertThat(discord.url).isNull()
        assertThat(result.socialLinks.first { it.network == SocialNetwork.TELEGRAM }.url)
            .isEqualTo("https://t.me/example")
        current = admin
        mvc.perform(
            post("/v1/persons").json(
                input.copy(tag = "no-contact", socialLinks = listOf(SocialLink(SocialNetwork.DISCORD))),
            ),
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `profile review retains original editable fields after the proposed change is applied`() {
        val profile = published("snapshot-profile")
        val changed = input(profile.tag, profile.version).copy(
            firstName = "Новое имя",
            tags = listOf("друзья"),
            searchKeywords = listOf("Поисковое имя"),
        )
        val change = receipt(
            mvc.perform(put("/v1/persons/${profile.id}").json(changed)).andExpect(status().isAccepted)
                .andReturn().response.contentAsString,
        )
        val saved = requests.findById(change.id).orElseThrow()
        val previous = mapper.readTree(saved.previousPayload)
        assertThat(previous.path("firstName").asText()).isEqualTo(profile.firstName)
        assertThat(previous.path("tags").isEmpty).isTrue()
        assertThat(previous.path("searchKeywords").isEmpty).isTrue()
        assertThat(previous.path("ratingOptions").size()).isEqualTo(2)
        assertThat(mapper.readTree(saved.payload).path("firstName").asText()).isEqualTo(changed.firstName)
        assertThat(persons.findById(profile.id).orElseThrow().firstName).isEqualTo(changed.firstName)
        mvc.perform(get("/v1/admin/moderation/${change.id}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.previousPayload").value(saved.previousPayload))
    }

    private fun published(tag: String): PersonProfile {
        val receipt = create(tag)
        approve(receipt)
        current = admin
        return mapper.readValue(
            mvc.perform(get("/v1/persons/by-tag/$tag"))
                .andExpect(status().isOk)
                .andReturn().response.contentAsString,
            PersonProfile::class.java,
        )
    }

    private fun create(tag: String, actor: Actor = admin): ModerationReceipt {
        current = actor
        return receipt(
            mvc.perform(
                post("/v1/persons")
                    .json(input(tag)),
            )
                .andExpect(status().isAccepted)
                .andReturn().response.contentAsString,
        )
    }

    private fun approve(receipt: ModerationReceipt) {
        if (requests.findById(receipt.id).orElseThrow().status.name == "APPROVED") {
            return
        }
        current = admin
        mvc.perform(
            post("/v1/admin/moderation/${receipt.id}/decision")
                .json(DecisionInput(Decision.APPROVE)),
        )
            .andExpect(status().isOk)
    }

    private fun input(tag: String, version: Long = 0) = ProfileInput(
        tag,
        "Пустой",
        "Профиль",
        "",
        emptyList(),
        emptyList(),
        listOf(
            RatingOptionInput(
                "🔥",
                "Огонь",
            ),
            RatingOptionInput(
                "🤝",
                "Свой",
            ),
        ),
        version,
    )
    private fun receipt(json: String): ModerationReceipt = mapper.readValue(json, ModerationReceipt::class.java)
    private fun org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder.json(value: Any) =
        contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(value))
}
