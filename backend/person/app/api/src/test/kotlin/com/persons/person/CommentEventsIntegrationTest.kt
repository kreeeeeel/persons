package com.persons.person

import com.persons.person.component.AccountProfiles
import com.persons.person.component.ActorResolver
import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import org.hamcrest.Matchers.containsInAnyOrder
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anySet
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

@SpringBootTest(properties = ["spring.datasource.url=jdbc:h2:mem:comment-events;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"])
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class CommentEventsIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var persons: PersonRepository

    @Autowired private lateinit var media: MediaRepository

    @Autowired private lateinit var comments: CommentRepository

    @Autowired private lateinit var moderation: ModerationRepository

    @MockitoBean private lateinit var actors: ActorResolver

    @MockitoBean private lateinit var accounts: AccountProfiles
    private val viewer = Actor(UUID.randomUUID(), "Зритель", false)
    private val created = Instant.parse("2026-10-22T10:00:00Z")

    @BeforeEach
    fun authenticate() {
        `when`(actors.optional()).thenReturn(viewer)
        `when`(accounts.profiles(anySet())).thenReturn(emptyMap())
    }

    @Test
    fun `events include other authors and both media kinds using published text instead of pending edits`() {
        val page = person()
        val photo = comment(page, upload(page, MediaKind.PHOTO))
        comment(page, upload(page, MediaKind.MOMENT))
        moderation.saveAndFlush(
            ModerationEntity(
                personId = page.id, targetId = photo.id, kind = ChangeKind.UPDATE_COMMENT,
                authorId = photo.authorId, payload = "{\"text\":\"Неопубликованная правка\"}",
            ),
        )
        mvc.perform(get("/v1/feed/comments")).andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.items[*].contextMediaKind").value(containsInAnyOrder("PHOTO", "MOMENT")))
            .andExpect(jsonPath("$.items[0].page.tag").value(page.tag))
            .andExpect(jsonPath("$.items[0].comment.text").value("Опубликованный комментарий"))
            .andExpect(jsonPath("$.items[0].comment.authorName").value("Кирилл Немтырев"))
            .andExpect(jsonPath("$.items[0].comment.canEdit").value(false))
    }

    @Test
    fun `visibility is applied before pagination including comment context and page visibility`() {
        val page = person()
        val visible = comment(page, upload(page, MediaKind.PHOTO))
        comments.saveAndFlush(CommentEntity(personId = page.id, text = "Стена"))
        comment(page, upload(page, MediaKind.MOMENT)).also { it.published = false }
        comment(page, upload(page, MediaKind.PHOTO)).also { it.deleted = true }
        comment(page, upload(page, MediaKind.PHOTO, MediaStatus.PENDING))
        comment(page, upload(page, MediaKind.PHOTO, MediaStatus.DELETED))
        comment(page, upload(page, MediaKind.AVATAR))
        val privatePage = person(published = false)
        comment(privatePage, upload(privatePage, MediaKind.PHOTO))
        val deletedPage = person(deleted = true)
        comment(deletedPage, upload(deletedPage, MediaKind.PHOTO))
        val otherPage = person()
        comment(page, upload(otherPage, MediaKind.PHOTO))
        mvc.perform(get("/v1/feed/comments").param("size", "1")).andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].comment.id").value(visible.id.toString()))
    }

    @Test
    fun `pagination remains stable for equal timestamps and works without a signed-in viewer`() {
        val page = person()
        val target = upload(page, MediaKind.MOMENT)
        listOf(1, 2, 3).stream().forEach { index ->
            comment(page, target, UUID.fromString("00000000-0000-4000-9000-00000000000$index"))
        }
        `when`(actors.optional()).thenReturn(null)
        mvc.perform(get("/v1/feed/comments").param("size", "2")).andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(3))
            .andExpect(jsonPath("$.items[0].comment.id").value("00000000-0000-4000-9000-000000000003"))
            .andExpect(jsonPath("$.items[1].comment.id").value("00000000-0000-4000-9000-000000000002"))
        mvc.perform(get("/v1/feed/comments").param("page", "1").param("size", "2")).andExpect(status().isOk)
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].comment.id").value("00000000-0000-4000-9000-000000000001"))
        mvc.perform(get("/v1/feed/comments").param("size", "61")).andExpect(status().isBadRequest)
    }

    private fun person(published: Boolean = true, deleted: Boolean = false): PersonEntity = persons.saveAndFlush(
        PersonEntity(
            tag = "p-${UUID.randomUUID().toString().take(8)}", firstName = "Вадим",
            published = published, deleted = deleted,
        ),
    )

    private fun upload(page: PersonEntity, kind: MediaKind, status: MediaStatus = MediaStatus.PUBLISHED): MediaEntity =
        media.saveAndFlush(
            MediaEntity(personId = page.id, kind = kind, status = status, objectKey = UUID.randomUUID().toString()),
        )

    private fun comment(page: PersonEntity, target: MediaEntity, id: UUID = UUID.randomUUID()): CommentEntity =
        comments.saveAndFlush(
            CommentEntity(
                id = id, personId = page.id, mediaId = target.id, text = "Опубликованный комментарий",
                authorName = "Кирилл Немтырев", createdAt = created,
            ),
        )
}
