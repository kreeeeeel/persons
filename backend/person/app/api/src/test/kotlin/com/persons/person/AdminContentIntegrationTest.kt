package com.persons.person

import com.persons.id.client.generated.model.UserProfile
import com.persons.person.component.AccountProfiles
import com.persons.person.component.ActorResolver
import com.persons.person.dao.entity.AchievementEntity
import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.entity.CreditEntryEntity
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.entity.NotificationEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.RatingEntity
import com.persons.person.dao.repository.AchievementRepository
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.CreditKind
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import com.persons.person.domain.NotificationKind
import com.persons.person.domain.ReviewStatus
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
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@SpringBootTest(
    properties = [
        "spring.datasource.url=\${PUBLICATIONS_TEST_DB_URL:jdbc:h2:mem:content-admin;MODE=PostgreSQL;DB_CLOSE_DELAY=-1}",

        "spring.datasource.username=\${PUBLICATIONS_TEST_DB_USER:sa}",
        "spring.datasource.password=\${PUBLICATIONS_TEST_DB_PASSWORD:}",
    ],
)
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class AdminContentIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var fixtures: JpaTestData

    @Autowired private lateinit var requests: ModerationRepository

    @Autowired private lateinit var achievements: AchievementRepository

    @MockitoBean private lateinit var actors: ActorResolver

    @MockitoBean private lateinit var accounts: AccountProfiles
    private val author = Actor(UUID.randomUUID(), "Автор", false)
    private val admin = Actor(UUID.randomUUID(), "Модератор", true)
    private var current: Actor? = admin
    private val created = Instant.parse("2020-01-02T12:00:00Z")

    @BeforeEach
    fun authenticate() {
        `when`(actors.administrator()).thenAnswer {
            val actor = current ?: throw UnauthorizedException()
            if (!actor.administrator) throw ForbiddenException()
            actor
        }
    }

    @Test
    fun `achievement search is literal and applied before pagination`() {
        achievements.saveAllAndFlush(
            listOf(
                AchievementEntity(title = "Надёжность", description = "Возврат 100%", imageObjectKey = "first"),
                AchievementEntity(title = "Возврат 1000", description = "Другой текст", imageObjectKey = "second"),
                AchievementEntity(title = "100% скрытая", imageObjectKey = "third", deleted = true),
            ),
        )
        mvc.perform(get("/v1/admin/achievements").param("q", "100%").param("size", "1"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].title").value("Надёжность"))
    }

    @Test
    fun `person table gets page avatar and current linked account identity in one result`() {
        val page = person()
        val avatar = media(page, "AVATAR", "PUBLISHED", "Аватар")
        fixtures.update(PersonEntity::class.java, { it.id == page }) { row ->
            row.ownerAccountId = author.id
            row.avatarMediaId = avatar
        }
        `when`(accounts.profiles(setOf(author.id))).thenReturn(
            mapOf(
                author.id to UserProfile(author.id, "Актуальное имя", false, 0),
            ),
        )
        mvc.perform(get("/v1/admin/persons").param("q", "catalog-${page.toString().take(8)}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.items[0].avatarMediaId").value(avatar.toString()))
            .andExpect(jsonPath("$.items[0].ownerName").value("Актуальное имя"))
            .andExpect(jsonPath("$.items[0].ownerTag").value("catalog-${page.toString().take(8)}"))
            .andExpect(jsonPath("$.items[0].status").value("PUBLISHED"))
    }

    @Test
    fun `catalog filters before pagination and counts all matching statuses with literal search`() {
        val person = person()
        media(person, "PHOTO", "PUBLISHED", "Поход 100%")
        media(person, "PHOTO", "PENDING", "Поход 100%")
        media(person, "PHOTO", "DELETED", "Поход 100%")
        media(person, "MOMENT", "PUBLISHED", "Поход 100%")
        media(person, "PHOTO", "PUBLISHED", "Поход 1000")
        mvc.perform(
            get("/v1/admin/content").param("kind", "PHOTO").param("q", "100%")
                .param("status", "PUBLISHED").param("personId", person.toString()).param("size", "1"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].personName").value("Иванов Тест"))
            .andExpect(jsonPath("$.items[0].sizeBytes").value(16))
            .andExpect(jsonPath("$.statistics.published").value(1))
            .andExpect(jsonPath("$.statistics.pending").value(1))
            .andExpect(jsonPath("$.statistics.hidden").value(1))
        mvc.perform(
            get("/v1/admin/content").param("kind", "PHOTO").param("q", "100%")
                .param("personId", person.toString()).param("page", "2").param("size", "1"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(3))
            .andExpect(jsonPath("$.items.length()").value(1))
    }

    @Test
    fun `catalog contains wall loans ratings pages and media exactly once and retains the destination`() {
        val person = person()
        fixtures.save(
            CommentEntity(
                id = person,
                personId = person,
                authorId = author.id,
                authorName = "Автор",
                text = "Стена",
                createdAt = created,
            ),
        )
        fixtures.save(
            CreditEntryEntity(
                id = person,
                personId = person,
                authorId = author.id,
                authorName = "Автор",
                kind = CreditKind.ON_TIME,
                description = "Вернул",
                createdAt = created,
            ),
        )
        fixtures.save(
            RatingEntity(
                id = person,
                personId = person,
                userId = author.id,
                authorName = "Автор",
                value = 5,
                emoji = "🔥",
                comment = "Отзыв",
                createdAt = created,
            ),
        )
        media(person, "MOMENT", "PUBLISHED", "Видео")
        mvc.perform(get("/v1/admin/content").param("personId", person.toString()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(5))
            .andExpect(jsonPath("$.items[?(@.kind == 'RATING')].text").value("🔥 5/5 Отзыв"))
            .andExpect(
                jsonPath("$.items[?(@.kind == 'MOMENT')].personTag").value(
                    "catalog-${person.toString().take(8)}",
                ),
            )
    }

    @Test
    fun `removing a published file rejects its pending edits and records the removal reason`() {
        val person = person()
        val file = media(person, "PHOTO", "PUBLISHED", "Фото")
        val pending = request(person, file, ChangeKind.UPDATE_MEDIA, ReviewStatus.PENDING)
        mvc.perform(
            post("/v1/admin/content/PHOTO/$file/hide").contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Нарушение правил\"}"),
        )
            .andExpect(status().isNoContent)
        requests.flush()
        assertThat(requests.findById(pending.id).orElseThrow().status).isEqualTo(ReviewStatus.REJECTED)
        assertThat(
            fixtures.all(MediaEntity::class.java).stream()
                .filter {
                    it.id == file
                }.toList().singleOrNull()?.status?.name,
        )
            .isEqualTo("DELETED")
        val deletion = requests.findAll().first { it.targetId == file && it.kind == ChangeKind.DELETE_MEDIA }
        assertThat(deletion.reason).isEqualTo("Нарушение правил")
        assertThat(
            fixtures.all(NotificationEntity::class.java).stream()
                .filter {
                    it.userId == author.id &&
                        it.kind == NotificationKind.REMOVED
                }.toList().singleOrNull()?.reason,
        ).isEqualTo("Нарушение правил")
        assertThat(deletion.reviewedBy).isEqualTo(admin.id)
        mvc.perform(
            post("/v1/admin/moderation/${pending.id}/decision").contentType(MediaType.APPLICATION_JSON)
                .content("{\"decision\":\"APPROVE\"}"),
        )
            .andExpect(status().isConflict)
    }

    @Test
    fun `removing a rating closes its pending review and preserves the published review in history`() {
        val person = person()
        val rating = UUID.randomUUID()
        fixtures.save(
            RatingEntity(
                id = rating,
                personId = person,
                userId = author.id,
                authorName = "Автор",
                value = 5,
                emoji = "🔥",
                comment = "Отзыв",
                createdAt = created,
            ),
        )
        val pending = request(person, rating, ChangeKind.UPDATE_RATING_COMMENT, ReviewStatus.PENDING)
        mvc.perform(
            post("/v1/admin/content/RATING/$rating/hide").contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Нарушение правил\"}"),
        )
            .andExpect(status().isNoContent)
        assertThat(
            fixtures.all(RatingEntity::class.java).stream()
                .filter {
                    it.id == rating
                }.count(),
        ).isZero()
        assertThat(requests.findById(pending.id).orElseThrow().status).isEqualTo(ReviewStatus.REJECTED)
        val audit = requests.findAll().first { it.targetId == rating && it.kind == ChangeKind.DELETE_RATING }
        assertThat(audit.payload).contains("text", "Отзыв")
        assertThat(audit.reason).isEqualTo("Нарушение правил")
    }

    @Test
    fun `rejects an unpublished file without creating an approval that could resurrect it`() {
        val person = person()
        val file = media(person, "MOMENT", "PENDING", "Черновик")
        val pending = request(person, file, ChangeKind.PUBLISH_MEDIA, ReviewStatus.PENDING)
        mvc.perform(
            post("/v1/admin/content/MOMENT/$file/hide").contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Не подходит\"}"),
        )
            .andExpect(status().isNoContent)
        assertThat(requests.findById(pending.id).orElseThrow().status).isEqualTo(ReviewStatus.REJECTED)
        assertThat(requests.findAll().filter { it.targetId == file }).hasSize(1)
    }

    @Test
    fun `moderation search type date sorting statistics and direct request retrieval agree`() {
        val person = person()
        val photo = media(person, "PHOTO", "PUBLISHED", "Море")
        val moment = media(person, "MOMENT", "PUBLISHED", "Море")
        val pending = request(person, photo, ChangeKind.UPDATE_MEDIA, ReviewStatus.PENDING)
        request(person, photo, ChangeKind.PUBLISH_MEDIA, ReviewStatus.APPROVED)
        request(person, moment, ChangeKind.UPDATE_MEDIA, ReviewStatus.PENDING)
        mvc.perform(
            get("/v1/admin/moderation").param("type", "PHOTO").param("status", "ALL")
                .param("q", "Иванов Тест").param("createdFrom", "2020-01-02T00:00:00Z")
                .param("createdTo", "2020-01-03T00:00:00Z").param("size", "1").param("order", "OLDEST"),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.statistics.pending").value(1))
            .andExpect(jsonPath("$.statistics.approved").value(1))
            .andExpect(jsonPath("$.statistics.automaticApproved").value(1))
            .andExpect(jsonPath("$.statistics.overdue").value(1))
        mvc.perform(get("/v1/admin/moderation/${pending.id}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.mediaId").value(photo.toString()))
            .andExpect(jsonPath("$.personName").value("Иванов Тест"))
        mvc.perform(
            get("/v1/admin/content").param("createdFrom", "2025-01-01T00:00:00Z")
                .param("createdTo", "2020-01-01T00:00:00Z"),
        )
            .andExpect(status().isBadRequest)
    }

    @Test
    fun `a video comment review points to its actual media and destination`() {
        val person = person()
        val video = media(person, "MOMENT", "PUBLISHED", "Видео")
        val comment = UUID.randomUUID()
        fixtures.save(
            CommentEntity(
                id = comment,
                personId = person,
                mediaId = video,
                authorId = author.id,
                authorName = "Автор",
                text = "Комментарий к видео",
                createdAt = created,
                published = false,
            ),
        )
        val pending = request(person, comment, ChangeKind.CREATE_COMMENT, ReviewStatus.PENDING)
        mvc.perform(get("/v1/admin/moderation/${pending.id}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.mediaId").value(video.toString()))
            .andExpect(jsonPath("$.mediaKind").value("MOMENT"))
    }

    @Test
    fun `non administrators cannot read catalog request details or remove publications`() {
        current = author
        mvc.perform(get("/v1/admin/content"))
            .andExpect(status().isForbidden)
        mvc.perform(get("/v1/admin/moderation/${UUID.randomUUID()}"))
            .andExpect(status().isForbidden)
        mvc.perform(
            post("/v1/admin/content/PHOTO/${UUID.randomUUID()}/hide").contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"Причина\"}"),
        )
            .andExpect(status().isForbidden)
        current = null
        mvc.perform(get("/v1/admin/content"))
            .andExpect(status().isUnauthorized)
    }

    private fun person(): UUID {
        val id = UUID.randomUUID()
        fixtures.save(
            PersonEntity(
                id = id,
                tag = "catalog-${id.toString().take(8)}",
                firstName = "Тест",
                lastName = "Иванов",
                description = "Описание",
                published = true,
                createdAt = created,
            ),
        )
        return id
    }

    private fun media(person: UUID, kind: String, status: String, caption: String): UUID {
        val id = UUID.randomUUID()
        fixtures.save(
            MediaEntity(
                id = id,
                personId = person,
                uploaderId = author.id,
                uploaderName = "Автор",
                kind = MediaKind.valueOf(kind),
                status = MediaStatus.valueOf(status),
                objectKey = id.toString(),
                contentType = "video/quicktime",
                sizeBytes = 16,
                caption = caption,
                createdAt = created,
            ),
        )
        return id
    }

    private fun request(person: UUID, target: UUID, kind: ChangeKind, status: ReviewStatus): ModerationEntity =
        requests.saveAndFlush(
            ModerationEntity(
                personId = person, personTag = "catalog", targetId = target, kind = kind, status = status,
                authorId = author.id, authorName = author.name, summary = "Материал",
                payload = "{}", createdAt = created,
            ),
        )
}
