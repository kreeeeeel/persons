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
import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.entity.ContentLikeEntity
import com.persons.person.dao.entity.CreditEntryEntity
import com.persons.person.dao.entity.RatingEntity
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.ContentLikeRepository
import com.persons.person.dao.repository.CreditEntryRepository
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.dao.repository.RatingRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ByteWindow
import com.persons.person.domain.ContentKind
import com.persons.person.domain.ReactionKind
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.UnauthorizedException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.EnumSource
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
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.time.Instant
import java.util.UUID
import javax.imageio.ImageIO

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class CommunityIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var mapper: ObjectMapper

    @Autowired private lateinit var requests: ModerationRepository

    @Autowired private lateinit var media: MediaRepository

    @Autowired private lateinit var commentRows: CommentRepository

    @Autowired private lateinit var loanRows: CreditEntryRepository

    @Autowired private lateinit var ratingRows: RatingRepository

    @Autowired private lateinit var contentVotes: ContentLikeRepository

    @Autowired private lateinit var personRows: PersonRepository

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
        `when`(actors.identity()).thenAnswer { current }
        `when`(actors.optional()).thenAnswer { current }
        `when`(actors.required()).thenAnswer {
            val actor = current ?: throw UnauthorizedException()
            actor
        }
        `when`(actors.administrator()).thenAnswer {
            val actor = current ?: throw UnauthorizedException()
            if (!actor.administrator) throw ForbiddenException()
            actor
        }
        `when`(actors.accountId("author@example.test")).thenReturn(friend.id)
        `when`(store.read(anyString(), nullable(ByteWindow::class.java))).thenReturn(ByteArrayResource(png()))
    }

    @Test
    fun `mine filters wall and loans before pagination and requires authentication`() {
        val person = published("mine-filter")
        mvc.perform(post("/v1/persons/${person.id}/comments").json(mapOf("text" to "Чужая история")))
            .andExpect(status().isAccepted)
        mvc.perform(
            post("/v1/persons/${person.id}/credit").json(mapOf("kind" to "ON_TIME", "description" to "Чужой займ")),
        ).andExpect(status().isAccepted)
        current = friend
        mvc.perform(post("/v1/persons/${person.id}/comments").json(mapOf("text" to "Моя история")))
            .andExpect(status().isAccepted)
        mvc.perform(
            post("/v1/persons/${person.id}/credit").json(mapOf("kind" to "SHORT_DELAY", "description" to "Мой займ")),
        ).andExpect(status().isAccepted)
        mvc.perform(get("/v1/persons/${person.id}/comments").param("mine", "true").param("size", "1"))
            .andExpect(status().isOk).andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].text").value("Моя история"))
        mvc.perform(get("/v1/persons/${person.id}/credit").param("mine", "true").param("size", "1"))
            .andExpect(status().isOk).andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].description").value("Мой займ"))
        current = other
        mvc.perform(get("/v1/persons/${person.id}/comments").param("mine", "true"))
            .andExpect(jsonPath("$.total").value(0))
        mvc.perform(get("/v1/persons/${person.id}/credit").param("mine", "true"))
            .andExpect(jsonPath("$.total").value(0))
        current = null
        mvc.perform(get("/v1/persons/${person.id}/comments").param("mine", "true"))
            .andExpect(status().isUnauthorized)
        mvc.perform(get("/v1/persons/${person.id}/credit").param("mine", "true"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `pending wall and loan text is visible only to its author until approval`() {
        val person = published("pending-text")
        current = friend
        val wall = json(
            mvc.perform(
                post("/v1/persons/${person.id}/comments")
                    .json(mapOf("text" to "Первая история")),
            ).andExpect(status().isAccepted),
        )
        val loan = json(
            mvc.perform(
                post("/v1/persons/${person.id}/credit")
                    .json(mapOf("kind" to "SHORT_DELAY", "description" to "Вернул немного позже")),
            )
                .andExpect(status().isAccepted),
        )
        mvc.perform(get("/v1/persons/${person.id}/comments"))
            .andExpect(jsonPath("$.items[0].moderationStatus").value("PENDING"))
            .andExpect(jsonPath("$.items[0].text").value("Первая история"))
        mvc.perform(get("/v1/persons/${person.id}/credit"))
            .andExpect(jsonPath("$.items[0].moderationStatus").value("PENDING"))
        current = other
        mvc.perform(get("/v1/persons/${person.id}/comments")).andExpect(jsonPath("$.total").value(0))
        mvc.perform(get("/v1/persons/${person.id}/credit")).andExpect(jsonPath("$.total").value(0))
        mvc.perform(get("/v1/persons/by-tag/${person.tag}"))
            .andExpect(jsonPath("$.stats.comments").value(0))
        approve(UUID.fromString(wall["id"].asText()))
        approve(UUID.fromString(loan["id"].asText()))
        current = null
        mvc.perform(get("/v1/persons/${person.id}/comments"))
            .andExpect(jsonPath("$.items[0].moderationStatus").value("APPROVED"))
        mvc.perform(get("/v1/persons/${person.id}/credit"))
            .andExpect(jsonPath("$.items[0].kind").value("SHORT_DELAY"))
            .andExpect(jsonPath("$.items[0].authorName").value("Автор"))
    }

    @Test
    fun `rejection removes staged comments and loan entries from the author feed`() {
        val person = published("rejected-text")
        current = friend
        val inputs = listOf(
            "comments" to mapOf("text" to "Не публикуем"),
            "credit" to mapOf("kind" to "NOT_RETURNED", "description" to "Не публикуем"),
        )
        inputs.stream().forEach { (path, input) ->
            val receipt = json(
                mvc.perform(post("/v1/persons/${person.id}/$path").json(input))
                    .andExpect(status().isAccepted),
            )
            current = admin
            mvc.perform(
                post("/v1/admin/moderation/${receipt["id"].asText()}/decision")
                    .json(DecisionInput(Decision.REJECT, "Проверка")),
            ).andExpect(status().isOk)
            current = friend
            mvc.perform(get("/v1/persons/${person.id}/$path")).andExpect(jsonPath("$.total").value(0))
        }
    }

    @Test
    fun `rating comments are moderated independently and palette supports joke emoji`() {
        val person = published("rating-comment")
        val route = "/v1/persons/${person.id}/rating"
        current = friend
        mvc.perform(put(route).json(mapOf("emoji" to "🤡", "value" to 4, "comment" to "Свой человек")))
            .andExpect(status().isOk).andExpect(jsonPath("$.commentStatus").value("PENDING"))
            .andExpect(jsonPath("$.comment").value("Свой человек"))
        val pending = requests.findAll().first { it.kind.name == "UPDATE_RATING_COMMENT" }
        mvc.perform(put(route).json(mapOf("emoji" to "💩", "value" to 3, "comment" to "Лучший человек")))
            .andExpect(jsonPath("$.calculationPending").value(true))
        assertThat(requests.findAll().count { it.kind.name == "UPDATE_RATING_COMMENT" }).isEqualTo(1)
        mvc.perform(get("/v1/persons/${person.id}/ratings"))
            .andExpect(jsonPath("$.items[0].mine").value(true))
        current = other
        mvc.perform(get("/v1/persons/${person.id}/ratings"))
            .andExpect(jsonPath("$.items[0].mine").value(false))
            .andExpect(jsonPath("$.items[0].comment").doesNotExist())
            .andExpect(jsonPath("$.items[0].value").value(3))
        approve(pending.id)
        current = null
        mvc.perform(get("/v1/persons/${person.id}/ratings"))
            .andExpect(jsonPath("$.items[0].comment").value("Лучший человек"))
            .andExpect(jsonPath("$.items[0].commentStatus").value("APPROVED"))
    }

    @Test
    fun `deleting a rating cancels its queued comment without leaving an approvable request`() {
        val person = published("rating-remove")
        current = friend
        val route = "/v1/persons/${person.id}/rating"
        mvc.perform(put(route).json(mapOf("emoji" to "💀", "value" to 2, "comment" to "Черновик")))
            .andExpect(status().isOk)
        val pending = requests.findAll().first { it.kind.name == "UPDATE_RATING_COMMENT" }
        mvc.perform(delete(route)).andExpect(jsonPath("$.total").value(0))
        current = admin
        mvc.perform(post("/v1/admin/moderation/${pending.id}/decision").json(DecisionInput(Decision.APPROVE)))
            .andExpect(status().isConflict)
    }

    @Test
    fun `media reaction counts remain available without exposing author lists`() {
        val person = published("private-voters")
        val id = photo(person.id)
        current = friend
        mvc.perform(put("/v1/media/$id/reaction").json(mapOf("reaction" to "LIKE")))
            .andExpect(status().isOk).andExpect(jsonPath("$.likes").value(1))
        current = null
        mvc.perform(get("/v1/media/$id/reactions").param("reaction", "LIKE"))
            .andExpect(status().isNotFound)
    }

    @Test
    fun `media views deduplicate visitors daily and navigation stays in the same gallery`() {
        val person = published("gallery-views")
        val first = photo(person.id)
        val second = photo(person.id)
        val unrelated = photo(published("gallery-other").id)
        current = null
        val visitor = mapOf("visitorId" to UUID.randomUUID())
        mvc.perform(post("/v1/media/$first/views").json(visitor)).andExpect(jsonPath("$.views").value(1))
        mvc.perform(post("/v1/media/$first/views").json(visitor)).andExpect(jsonPath("$.views").value(1))
        mvc.perform(post("/v1/media/$first/views").json(mapOf("visitorId" to UUID.randomUUID())))
            .andExpect(jsonPath("$.views").value(2))
        mvc.perform(get("/v1/media/$first/details")).andExpect(jsonPath("$.views").value(2))
        val navigation = json(mvc.perform(get("/v1/media/$first/details")).andExpect(status().isOk))
        val neighbors = listOf("previousMediaId", "nextMediaId").mapNotNull { navigation[it]?.asText() }
        assertThat(neighbors).containsExactly(second.toString()).doesNotContain(unrelated.toString())
        mvc.perform(get("/v1/persons/${person.id}/photos"))
            .andExpect(jsonPath("$.items[?(@.id == '$first')].views").value(2))
    }

    @Test
    fun `my page requests are unique per account and become verified after approval`() {
        current = friend
        mvc.perform(get("/v1/persons/mine")).andExpect(jsonPath("$.pendingCreation").value(false))
        val input = ProfileInput(
            "my-own-page", "Автор", "", "", emptyList(), emptyList(),
            listOf(RatingOptionInput("💜", "Свой")), 0,
        )
        val receipt = json(mvc.perform(post("/v1/persons/mine").json(input)).andExpect(status().isAccepted))
        mvc.perform(get("/v1/persons/mine"))
            .andExpect(jsonPath("$.pendingCreation").value(true)).andExpect(jsonPath("$.person").doesNotExist())
        mvc.perform(post("/v1/persons/mine").json(input)).andExpect(status().isConflict)
        current = other
        mvc.perform(get("/v1/persons/mine")).andExpect(jsonPath("$.pendingCreation").value(false))
        approve(UUID.fromString(receipt["id"].asText()))
        current = friend
        mvc.perform(get("/v1/persons/mine"))
            .andExpect(jsonPath("$.person.tag").value("my-own-page"))
            .andExpect(jsonPath("$.pendingCreation").value(false))
        mvc.perform(get("/v1/persons/by-tag/my-own-page")).andExpect(jsonPath("$.verified").value(true))
        current = null
        mvc.perform(get("/v1/persons/mine")).andExpect(status().isUnauthorized)
    }

    @Test
    fun `published comments reviews and loan entries support idempotent likes and feed counts`() {
        val person = published("content-likes")
        current = friend
        val wall = json(
            mvc.perform(
                post("/v1/persons/${person.id}/comments")
                    .json(mapOf("text" to "История")),
            ).andExpect(status().isAccepted),
        )
        val loan = json(
            mvc.perform(
                post("/v1/persons/${person.id}/credit")
                    .json(mapOf("kind" to "ON_TIME", "description" to "Вернул вовремя")),
            )
                .andExpect(status().isAccepted),
        )
        val commentId = requests.findById(UUID.fromString(wall["id"].asText())).orElseThrow().targetId
        val loanId = requests.findById(UUID.fromString(loan["id"].asText())).orElseThrow().targetId
        mvc.perform(put("/v1/content/COMMENT/$commentId/like")).andExpect(status().isNotFound)
        approve(UUID.fromString(wall["id"].asText()))
        approve(UUID.fromString(loan["id"].asText()))
        mvc.perform(put("/v1/persons/${person.id}/rating").json(mapOf("emoji" to "💜", "value" to 5)))
            .andExpect(status().isOk)
        val rating = json(mvc.perform(get("/v1/persons/${person.id}/ratings")))
            .get("items").get(0).get("id").asText()
        listOf("COMMENT" to commentId.toString(), "LOAN" to loanId.toString(), "RATING" to rating)
            .stream().forEach { (kind, id) ->
                current = friend
                mvc.perform(put("/v1/content/$kind/$id/like"))
                    .andExpect(jsonPath("$.count").value(1)).andExpect(jsonPath("$.liked").value(true))
                mvc.perform(put("/v1/content/$kind/$id/like")).andExpect(jsonPath("$.count").value(1))
                current = other
                mvc.perform(put("/v1/content/$kind/$id/like")).andExpect(jsonPath("$.count").value(2))
                mvc.perform(delete("/v1/content/$kind/$id/like")).andExpect(jsonPath("$.count").value(1))
                current = null
                mvc.perform(get("/v1/content/$kind/$id/like"))
                    .andExpect(jsonPath("$.count").value(1)).andExpect(jsonPath("$.liked").value(false))
                mvc.perform(put("/v1/content/$kind/$id/like")).andExpect(status().isUnauthorized)
            }
        listOf("comments", "credit", "ratings").stream().forEach { path ->
            mvc.perform(get("/v1/persons/${person.id}/$path"))
                .andExpect(jsonPath("$.items[0].likes").value(1))
        }
        current = friend
        mvc.perform(delete("/v1/persons/${person.id}/rating")).andExpect(status().isOk)
        mvc.perform(get("/v1/content/RATING/$rating/like")).andExpect(status().isNotFound)
    }

    @ParameterizedTest
    @EnumSource(ContentKind::class)
    fun `content reactions are exclusive idempotent removable and preserve legacy unlike semantics`(kind: ContentKind) {
        val person = published("reaction-" + kind.name.lowercase())
        val target = feedEntry(kind, person.id, Instant.now())
        val route = "/v1/content/$kind/$target/reaction"
        current = friend
        mvc.perform(put(route).json(mapOf("reaction" to "LIKE")))
            .andExpect(status().isOk).andExpect(jsonPath("$.count").value(1))
        mvc.perform(put(route).json(mapOf("reaction" to "DISLIKE")))
            .andExpect(jsonPath("$.count").value(0)).andExpect(jsonPath("$.dislikes").value(1))
            .andExpect(jsonPath("$.liked").value(false)).andExpect(jsonPath("$.disliked").value(true))
        mvc.perform(put(route).json(mapOf("reaction" to "DISLIKE")))
            .andExpect(jsonPath("$.dislikes").value(1))
        mvc.perform(delete("/v1/content/$kind/$target/like"))
            .andExpect(jsonPath("$.dislikes").value(1))
        current = other
        mvc.perform(put(route).json(mapOf("reaction" to "LIKE")))
            .andExpect(jsonPath("$.count").value(1)).andExpect(jsonPath("$.dislikes").value(1))
        current = friend
        mvc.perform(delete(route)).andExpect(jsonPath("$.dislikes").value(0))
        mvc.perform(delete(route)).andExpect(jsonPath("$.count").value(1))
        mvc.perform(put(route).json(mapOf("reaction" to "INVALID"))).andExpect(status().isBadRequest)
        if (kind != ContentKind.RATING) {
            val pending = feedEntry(kind, person.id, Instant.now(), false)
            mvc.perform(put("/v1/content/$kind/$pending/reaction").json(mapOf("reaction" to "DISLIKE")))
                .andExpect(status().isNotFound)
        }
        current = null
        mvc.perform(put(route).json(mapOf("reaction" to "DISLIKE"))).andExpect(status().isUnauthorized)
    }

    @ParameterizedTest
    @EnumSource(ContentKind::class)
    fun `sorts the complete visible feed before pagination and returns both reaction counts`(kind: ContentKind) {
        val person = published("sorted-" + kind.name.lowercase())
        val timestamp = Instant.parse("2026-10-18T00:00:00Z")
        val oldest = feedEntry(kind, person.id, timestamp)
        val middle = feedEntry(kind, person.id, timestamp.plusSeconds(60))
        val newest = feedEntry(kind, person.id, timestamp.plusSeconds(120))
        listOf(friend.id, other.id).stream().forEach { user ->
            contentVotes.save(ContentLikeEntity(targetKind = kind, targetId = oldest, userId = user))
            contentVotes.save(
                ContentLikeEntity(targetKind = kind, targetId = middle, userId = user, reaction = ReactionKind.DISLIKE),
            )
        }
        val outsider = feedEntry(kind, published("outside-" + kind.name.lowercase()).id, timestamp)
        contentVotes.saveAndFlush(ContentLikeEntity(targetKind = kind, targetId = outsider))
        if (kind != ContentKind.RATING) feedEntry(kind, person.id, timestamp.plusSeconds(240), false)
        current = null
        val path = when (kind) {
            ContentKind.COMMENT -> "comments"
            ContentKind.RATING -> "ratings"
            ContentKind.LOAN -> "credit"
        }
        val route = "/v1/persons/${person.id}/$path"
        mapOf(
            "NEWEST" to listOf(newest, middle, oldest), "OLDEST" to listOf(oldest, middle, newest),
            "MOST_LIKED" to listOf(oldest, newest, middle), "MOST_DISLIKED" to listOf(middle, newest, oldest),
        ).entries.stream().forEach { (order, expected) ->
            val first = json(mvc.perform(get(route).param("sort", order).param("size", "2")))
            val second = json(mvc.perform(get(route).param("sort", order).param("size", "2").param("page", "1")))
            assertThat(first["total"].asInt()).isEqualTo(3)
            val ids = (first["items"].toList() + second["items"].toList()).stream()
                .map { UUID.fromString(it["id"].asText()) }.toList()
            assertThat(ids).containsExactlyElementsOf(expected)
        }
        current = friend
        val feed = json(mvc.perform(get(route).param("sort", "MOST_DISLIKED")))
        assertThat(feed["items"][0]["dislikes"].asInt()).isEqualTo(2)
        assertThat(feed["items"][0]["dislikedByMe"].asBoolean()).isTrue()
        mvc.perform(get(route).param("sort", "INVALID")).andExpect(status().isBadRequest)
    }

    @ParameterizedTest
    @EnumSource(ContentKind::class)
    fun `content reaction counts remain available without exposing author lists`(kind: ContentKind) {
        val person = published("private-votes-" + kind.name.lowercase())
        val target = feedEntry(kind, person.id, Instant.now())
        val route = "/v1/content/$kind/$target"
        current = friend
        mvc.perform(put("$route/reaction").json(mapOf("reaction" to "LIKE")))
            .andExpect(status().isOk).andExpect(jsonPath("$.count").value(1))
        current = null
        mvc.perform(get("$route/reactions").param("reaction", "LIKE"))
            .andExpect(status().isNotFound)
        mvc.perform(get("$route/like")).andExpect(status().isOk).andExpect(jsonPath("$.count").value(1))
    }

    @ParameterizedTest
    @EnumSource(ContentKind::class)
    fun `existing feed entries show current account name and avatar after an identity change`(kind: ContentKind) {
        val person = published("identity-" + kind.name.lowercase())
        val target = feedEntry(kind, person.id, Instant.now())
        val authorId = when (kind) {
            ContentKind.COMMENT -> commentRows.findById(target).orElseThrow().authorId
            ContentKind.RATING -> ratingRows.findById(target).orElseThrow().userId
            ContentKind.LOAN -> loanRows.findById(target).orElseThrow().authorId
        }
        val route = "/v1/persons/${person.id}/" + when (kind) {
            ContentKind.COMMENT -> "comments"
            ContentKind.RATING -> "ratings"
            ContentKind.LOAN -> "credit"
        }
        val original = com.persons.id.client.generated.model.UserProfile(authorId, "Старое имя", true, 1)
        `when`(accountProfiles.profiles(setOf(authorId))).thenReturn(mapOf(authorId to original))
        mvc.perform(get(route)).andExpect(status().isOk)
            .andExpect(jsonPath("$.items[0].authorName").value("Старое имя"))
            .andExpect(jsonPath("$.items[0].authorAvatarUrl").value("/api/person/v1/authors/$authorId/avatar?v=1"))
        `when`(accountProfiles.profiles(setOf(authorId))).thenReturn(
            mapOf(authorId to original.copy(name = "Новое имя", version = 2)),
        )
        mvc.perform(get(route)).andExpect(status().isOk)
            .andExpect(jsonPath("$.items[0].authorName").value("Новое имя"))
            .andExpect(jsonPath("$.items[0].authorAvatarUrl").value("/api/person/v1/authors/$authorId/avatar?v=2"))
        `when`(accountProfiles.profiles(setOf(authorId))).thenReturn(
            mapOf(authorId to original.copy(name = "Новое имя", hasAvatar = false, version = 3)),
        )
        mvc.perform(get(route)).andExpect(status().isOk)
            .andExpect(jsonPath("$.items[0].authorName").value("Новое имя"))
            .andExpect(jsonPath("$.items[0].authorAvatarUrl").doesNotExist())
    }

    @Test
    fun `avatar proxy only reads an existing project participant and forwards current account bytes`() {
        val person = published("author-avatar")
        val comment = commentRows.saveAndFlush(CommentEntity(personId = person.id, authorId = friend.id))
        val picture = png()
        `when`(accountProfiles.avatar(friend.id)).thenReturn(picture)
        mvc.perform(get("/v1/authors/${friend.id}/avatar")).andExpect(status().isOk)
            .andExpect(content().bytes(picture))
            .andExpect(header().string("Cache-Control", "private, no-store"))
        val unknown = UUID.randomUUID()
        mvc.perform(get("/v1/authors/$unknown/avatar").accept(MediaType.IMAGE_JPEG))
            .andExpect(status().isNotFound)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        org.mockito.Mockito.verify(accountProfiles, org.mockito.Mockito.never()).avatar(unknown)
        org.mockito.Mockito.doThrow(UnauthorizedException()).`when`(actors).requireService()
        mvc.perform(get("/v1/authors/${comment.authorId}/avatar")).andExpect(status().isUnauthorized)
    }

    private fun feedEntry(kind: ContentKind, person: UUID, time: Instant, published: Boolean = true): UUID =
        when (kind) {
            ContentKind.COMMENT -> commentRows.saveAndFlush(
                CommentEntity(
                    personId = person, text = "Comment", authorName = "Author", createdAt = time, published = published,
                ),
            ).id
            ContentKind.RATING -> ratingRows.saveAndFlush(
                RatingEntity(personId = person, value = 4, emoji = "⭐", authorName = "Author", createdAt = time),
            ).id
            ContentKind.LOAN -> loanRows.saveAndFlush(
                CreditEntryEntity(
                    personId = person, description = "Loan", authorName = "Author",
                    createdAt = time, published = published,
                ),
            ).id
        }

    @Test
    fun `pending media is visible to its uploader and read only until approval`() {
        val person = published("own-pending-media")
        val publishedId = photo(person.id)
        current = friend
        val receipt = json(
            mvc.perform(
                multipart("/v1/persons/${person.id}/media")
                    .file(image()).param("kind", "PHOTO").param("caption", "Новое фото"),
            )
                .andExpect(status().isAccepted),
        )
        val requestId = UUID.fromString(receipt["id"].asText())
        val id = requests.findById(requestId).orElseThrow().targetId
        mvc.perform(get("/v1/persons/${person.id}/photos"))
            .andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.items[?(@.id == '$id')].moderationStatus").value("PENDING"))
        mvc.perform(get("/v1/media/$id/details")).andExpect(status().isOk)
            .andExpect(jsonPath("$.canInteract").value(false))
            .andExpect(jsonPath("$.moderationStatus").value("PENDING"))
        mvc.perform(get("/v1/media/$id/content")).andExpect(status().isOk)
        mvc.perform(post("/v1/media/$id/views").json(mapOf("visitorId" to UUID.randomUUID())))
            .andExpect(jsonPath("$.views").value(0))
        mvc.perform(put("/v1/media/$id/reaction").json(mapOf("reaction" to "LIKE")))
            .andExpect(status().isNotFound)
        mvc.perform(
            post("/v1/persons/${person.id}/comments")
                .json(mapOf("text" to "Нельзя пока", "mediaId" to id)),
        )
            .andExpect(status().isNotFound)
        val details = json(mvc.perform(get("/v1/media/$publishedId/details")))
        assertThat(listOf("previousMediaId", "nextMediaId").mapNotNull { details[it]?.asText() })
            .containsExactly(id.toString())
        current = other
        mvc.perform(get("/v1/persons/${person.id}/photos")).andExpect(jsonPath("$.total").value(1))
        mvc.perform(get("/v1/media/$id/details")).andExpect(status().isNotFound)
        current = null
        mvc.perform(get("/v1/media/$id/content")).andExpect(status().isNotFound)
        approve(requestId)
        current = friend
        mvc.perform(get("/v1/media/$id/details")).andExpect(jsonPath("$.canInteract").value(true))
        mvc.perform(put("/v1/media/$id/reaction").json(mapOf("reaction" to "LIKE")))
            .andExpect(status().isOk).andExpect(jsonPath("$.likes").value(1))
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
