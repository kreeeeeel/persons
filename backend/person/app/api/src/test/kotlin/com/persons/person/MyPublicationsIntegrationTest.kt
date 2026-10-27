package com.persons.person

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.id.client.generated.model.UserProfile
import com.persons.person.component.AccountProfiles
import com.persons.person.component.ActorResolver
import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.entity.CreditEntryEntity
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.RatingEntity
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.CreditEntryRepository
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.dao.repository.RatingRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
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
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID
import java.util.stream.Stream
import java.util.stream.StreamSupport

@SpringBootTest(
    properties = [
        "spring.datasource.url=\${PUBLICATIONS_TEST_DB_URL:jdbc:h2:mem:my-publications;MODE=PostgreSQL;DB_CLOSE_DELAY=-1}",

        "spring.datasource.username=\${PUBLICATIONS_TEST_DB_USER:sa}",
        "spring.datasource.password=\${PUBLICATIONS_TEST_DB_PASSWORD:}",
    ],
)
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class MyPublicationsIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var mapper: ObjectMapper

    @Autowired private lateinit var persons: PersonRepository

    @Autowired private lateinit var comments: CommentRepository

    @Autowired private lateinit var ratings: RatingRepository

    @Autowired private lateinit var credits: CreditEntryRepository

    @Autowired private lateinit var media: MediaRepository

    @Autowired private lateinit var moderation: ModerationRepository

    @MockitoBean private lateinit var actors: ActorResolver

    @MockitoBean private lateinit var accounts: AccountProfiles
    private val author = Actor(UUID.randomUUID(), "Автор", false)
    private val other = UUID.randomUUID()
    private val created = Instant.parse("2026-10-22T10:00:00Z")

    @BeforeEach
    fun authenticate() {
        `when`(actors.required()).thenReturn(author)
        `when`(accounts.profiles(setOf(author.id))).thenReturn(emptyMap())
    }

    @Test
    fun `public author pages exclude pending hidden and private content and never grant author actions to visitors`() {
        `when`(actors.optional()).thenReturn(null)
        `when`(accounts.profiles(setOf(author.id))).thenReturn(
            mapOf(
                author.id to UserProfile(author.id, author.name, false, 0),
            ),
        )
        val page = person("public-author", owner = author.id)
        val visible = comment(page, text = "Public text")
        comment(page, text = "Pending text", published = false)
        comment(person("private-author", published = false, owner = other))
        comment(person("removed-author", deleted = true))
        upload(page, MediaKind.PHOTO, MediaStatus.PENDING)
        moderation.saveAndFlush(
            ModerationEntity(
                personId = page.id, personTag = page.tag, targetId = visible.id, kind = ChangeKind.UPDATE_COMMENT,
                authorId = author.id, authorName = author.name,
                payload = "{\"text\":\"Private pending edit\"}", createdAt = created,
            ),
        )
        mvc.perform(get("/v1/authors/by-handle/public-author"))
            .andExpect(status().isOk).andExpect(jsonPath("$.id").value(author.id.toString()))
            .andExpect(jsonPath("$.handle").value("public-author")).andExpect(jsonPath("$.email").doesNotExist())
        mvc.perform(get("/v1/publications/by-author/${author.id}"))
            .andExpect(status().isOk).andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].comment.text").value("Public text"))
            .andExpect(jsonPath("$.items[0].comment.canRemove").value(false))
            .andExpect(jsonPath("$.items[0].comment.canEdit").value(false))
        `when`(actors.optional()).thenReturn(author)
        mvc.perform(get("/v1/publications/by-author/public-author").param("kind", "COMMENT"))
            .andExpect(status().isOk).andExpect(jsonPath("$.total").value(2))
        mvc.perform(get("/v1/authors/by-handle/${UUID.randomUUID()}"))
            .andExpect(status().isNotFound)
    }

    @Test
    fun `all five types belong to the current author and destination is included`() {
        val page = person("first")
        comment(page)
        comment(page, authorId = other)
        ratings.saveAndFlush(RatingEntity(personId = page.id, userId = author.id, createdAt = created))
        ratings.saveAndFlush(RatingEntity(personId = page.id, userId = other, createdAt = created))
        credits.saveAndFlush(CreditEntryEntity(personId = page.id, authorId = author.id, createdAt = created))
        upload(page, MediaKind.PHOTO)
        upload(page, MediaKind.MOMENT)
        val result = mvc.perform(get("/v1/publications/mine").param("authorId", other.toString()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(5))
            .andExpect(jsonPath("$.items[0].page.tag").value("first"))
            .andReturn()
        val items = mapper.readTree(result.response.contentAsString).get("items")
        assertThat(
            StreamSupport.stream(items.spliterator(), false).map {
                it.get("kind").asText()
            }.toList(),
        ).containsExactly("COMMENT", "CREDIT", "MOMENT", "PHOTO", "RATING")
        mvc.perform(get("/v1/publications/mine").param("kind", "RATING"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.items[0].rating.mine").value(true))
            .andExpect(jsonPath("$.total").value(1))
    }

    @Test
    fun `page search is literal and filters before pagination instead of searching publication text`() {
        val first = person("full", "Поход 100%")
        val second = person("other", "Поход 1000")
        comment(first, text = "Обычный текст")
        comment(first, text = "Ещё текст")
        comment(second, text = "Поход 100%")
        mvc.perform(get("/v1/publications/mine").param("q", "100%").param("size", "1").param("page", "1"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].page.tag").value("full"))
        mvc.perform(get("/v1/publications/mine").param("q", " other "))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].page.tag").value("other"))
    }

    @Test
    fun `pending content is included but drafts removed content and inaccessible destinations are excluded`() {
        val page = person("public")
        val pending = comment(page, published = false)
        comment(page, deleted = true)
        upload(page, MediaKind.PHOTO, MediaStatus.STAGED)
        upload(page, MediaKind.PHOTO, MediaStatus.DELETED)
        upload(page, MediaKind.PHOTO, MediaStatus.PURGED)
        upload(page, MediaKind.AVATAR)
        upload(page, MediaKind.PHOTO, MediaStatus.PENDING)
        comment(person("deleted", deleted = true))
        comment(person("private", published = false, owner = other))
        comment(person("own-private", published = false, owner = author.id))
        mvc.perform(get("/v1/publications/mine"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(3))
        mvc.perform(get("/v1/publications/mine").param("kind", "COMMENT").param("q", "public"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.items[0].id").value(pending.id.toString()))
            .andExpect(jsonPath("$.items[0].comment.moderationStatus").value("PENDING"))
    }

    @Test
    fun `comments on photos and videos retain context and exclude removed media`() {
        val page = person("media")
        val photo = upload(page, MediaKind.PHOTO)
        val video = upload(page, MediaKind.MOMENT)
        val removed = upload(page, MediaKind.PHOTO, MediaStatus.DELETED)
        Stream.of(photo, video, removed).forEach { comment(page, mediaId = it.id) }
        val response = mvc.perform(get("/v1/publications/mine").param("kind", "COMMENT"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(2)).andReturn()
        val items = mapper.readTree(response.response.contentAsString).get("items")
        assertThat(
            StreamSupport.stream(items.spliterator(), false).map {
                it.get("contextMediaKind").asText()
            }.toList(),
        )
            .containsExactlyInAnyOrder("PHOTO", "MOMENT")
        assertThat(
            StreamSupport.stream(items.spliterator(), false).map { it.get("comment").get("mediaId").asText() }.toList(),
        )
            .containsExactlyInAnyOrder(photo.id.toString(), video.id.toString())
    }

    @Test
    fun `current pending edits are visible only for their author`() {
        val page = person("edited")
        val entry = comment(page, text = "Старый текст")
        moderation.saveAndFlush(
            ModerationEntity(
                personId = page.id, personTag = page.tag, targetId = entry.id, kind = ChangeKind.UPDATE_COMMENT,
                authorId = author.id, authorName = author.name, payload = "{\"text\":\"Новый текст\"}",
                createdAt = created,
            ),
        )
        mvc.perform(get("/v1/publications/mine"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.items[0].comment.text").value("Новый текст"))
            .andExpect(jsonPath("$.items[0].comment.moderationStatus").value("PENDING"))
        `when`(actors.required()).thenReturn(Actor(other, "Другой", false))
        mvc.perform(get("/v1/publications/mine"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(0))
    }

    @Test
    fun `pagination handles identical timestamps and cross table ids without duplicates`() {
        val page = person("ties")
        val entry = comment(page)
        upload(page, MediaKind.PHOTO, id = entry.id)
        val ids = Stream.of(0, 1).map { index ->
            val response = mvc.perform(get("/v1/publications/mine").param("size", "1").param("page", index.toString()))
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items.length()").value(1)).andReturn()
            val item = mapper.readTree(response.response.contentAsString).get("items").get(0)
            "${item.get("kind").asText()}:${item.get("id").asText()}"
        }.toList()
        assertThat(ids).containsExactly("COMMENT:${entry.id}", "PHOTO:${entry.id}")
        mvc.perform(get("/v1/publications/mine").param("page", "20"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.items.length()").value(0))
            .andExpect(jsonPath("$.total").value(2))
    }

    @Test
    fun `authentication and contract validation are required`() {
        Stream.of("size=0", "page=-1", "kind=PERSON", "q=${"a".repeat(121)}").forEach {
            mvc.perform(get("/v1/publications/mine?$it")).andExpect(status().isBadRequest)
        }
        `when`(actors.required()).thenThrow(UnauthorizedException())
        mvc.perform(get("/v1/publications/mine")).andExpect(status().isUnauthorized)
    }

    private fun person(
        tag: String,
        name: String = "Страница",
        published: Boolean = true,
        deleted: Boolean = false,
        owner: UUID? = null,
    ): PersonEntity = persons.saveAndFlush(
        PersonEntity(tag = tag, firstName = name, published = published, deleted = deleted, ownerAccountId = owner),
    )

    private fun comment(
        page: PersonEntity,
        text: String = "Комментарий",
        authorId: UUID = author.id,
        published: Boolean = true,
        deleted: Boolean = false,
        mediaId: UUID? = null,
    ): CommentEntity = comments.saveAndFlush(
        CommentEntity(
            personId = page.id, authorId = authorId, authorName = author.name, text = text, createdAt = created,
            published = published, deleted = deleted, mediaId = mediaId,
        ),
    )

    private fun upload(
        page: PersonEntity,
        kind: MediaKind,
        status: MediaStatus = MediaStatus.PUBLISHED,
        id: UUID = UUID.randomUUID(),
    ): MediaEntity = media.saveAndFlush(
        MediaEntity(
            id = id, personId = page.id, uploaderId = author.id, uploaderName = author.name,
            kind = kind, status = status, objectKey = id.toString(), contentType = "image/png", createdAt = created,
        ),
    )
}
