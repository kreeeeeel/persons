package com.persons.person

import com.persons.person.component.AccountProfiles
import com.persons.person.component.ActorResolver
import com.persons.person.dao.entity.AchievementEntity
import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.entity.CreditEntryEntity
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.PersonAchievementEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.ProfileViewEntity
import com.persons.person.dao.entity.RatingEntity
import com.persons.person.dao.entity.SocialLinkEntity
import com.persons.person.domain.Actor
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import com.persons.person.domain.SocialNetwork
import com.persons.person.maintenance.dao.entity.CsMatchEntity
import com.persons.person.maintenance.dao.entity.DotaMatchEntity
import com.persons.person.maintenance.dao.entity.LeetifySyncEntity
import jakarta.persistence.EntityManager
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
import java.util.stream.IntStream

@SpringBootTest(
    properties = [
        "spring.datasource.url=\${COMMUNITY_TEST_DB_URL:jdbc:h2:mem:community-read;MODE=PostgreSQL;DB_CLOSE_DELAY=-1}",
        "spring.datasource.username=\${COMMUNITY_TEST_DB_USER:sa}",
        "spring.datasource.password=\${COMMUNITY_TEST_DB_PASSWORD:}",
    ],
)
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class CommunityReadIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var entities: EntityManager

    @MockitoBean private lateinit var actors: ActorResolver

    @MockitoBean private lateinit var accounts: AccountProfiles
    private val viewer = Actor(UUID.randomUUID(), "Зритель", false)
    private val old = Instant.parse("2024-01-01T10:00:00Z")

    @BeforeEach
    fun authenticate() {
        `when`(actors.optional()).thenReturn(viewer)
        `when`(accounts.profiles(anySet())).thenReturn(emptyMap())
    }

    @Test
    fun `directory exposes actual published pages and statistics with sorting before pagination`() {
        val first = person("anna", "Анна")
        val second = person("boris", "Борис")
        person("private", "Скрытая", published = false)
        person("deleted", "Удалённая", deleted = true)
        val avatar = media(first, MediaKind.AVATAR)
        first.avatarMediaId = avatar.id
        media(first, MediaKind.PHOTO)
        media(first, MediaKind.PHOTO, MediaStatus.PENDING)
        media(first, MediaKind.MOMENT)
        media(first, MediaKind.MOMENT, MediaStatus.DELETED)
        save(RatingEntity(personId = first.id, value = 3))
        save(RatingEntity(personId = first.id, value = 5))
        save(ProfileViewEntity(personId = second.id, visitorHash = "one"))
        save(ProfileViewEntity(personId = second.id, visitorHash = "two"))
        mvc.perform(get("/v1/persons/directory").param("size", "1").param("order", "VIEWS"))
            .andExpect(status().isOk).andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.items[0].tag").value("boris"))
            .andExpect(jsonPath("$.items[0].views").value(2))
            .andExpect(jsonPath("$.items[0].ratingAverage").doesNotExist())
        mvc.perform(get("/v1/persons/directory").param("size", "1").param("page", "1"))
            .andExpect(status().isOk).andExpect(jsonPath("$.items[0].id").value(first.id.toString()))
            .andExpect(jsonPath("$.items[0].fullName").value("Анна"))
            .andExpect(jsonPath("$.items[0].avatarMediaId").value(avatar.id.toString()))
            .andExpect(jsonPath("$.items[0].photos").value(1))
            .andExpect(jsonPath("$.items[0].moments").value(1))
            .andExpect(jsonPath("$.items[0].ratingAverage").value(4.0))
        mvc.perform(get("/v1/persons/directory").param("order", "RATING").param("size", "1"))
            .andExpect(status().isOk).andExpect(jsonPath("$.items[0].tag").value("anna"))
        mvc.perform(get("/v1/persons/directory").param("order", "NAME").param("size", "1"))
            .andExpect(status().isOk).andExpect(jsonPath("$.items[0].tag").value("anna"))
    }

    @Test
    fun `feed includes historical publications from every public page without preview sources`() {
        val first = person("first", "Первая")
        val other = person("other", "Другая")
        save(CommentEntity(personId = first.id, text = "Старая запись", createdAt = old))
        val photo = media(other, MediaKind.PHOTO)
        media(other, MediaKind.MOMENT)
        save(CommentEntity(personId = other.id, mediaId = photo.id, text = "Под фото", createdAt = old))
        save(RatingEntity(personId = first.id, value = 4, createdAt = old))
        save(CreditEntryEntity(personId = other.id, description = "Вернул", createdAt = old))
        val achievement = save(AchievementEntity(title = "Награда"))
        save(PersonAchievementEntity(personId = first.id, achievementId = achievement.id, assignedAt = old))
        mvc.perform(get("/v1/feed")).andExpect(status().isOk).andExpect(jsonPath("$.total").value(7))
            .andExpect(
                jsonPath("$.items[*].kind").value(
                    containsInAnyOrder(
                        "WALL", "COMMENT", "PHOTO", "MOMENT", "RATING", "LOAN", "ACHIEVEMENT",
                    ),
                ),
            )
            .andExpect(jsonPath("$.items[?(@.kind == 'WALL')].comment.text").value("Старая запись"))
            .andExpect(jsonPath("$.items[?(@.kind == 'COMMENT')].contextMediaKind").value("PHOTO"))
            .andExpect(jsonPath("$.items[?(@.kind == 'PHOTO')].photo.canRemove").value(false))
            .andExpect(jsonPath("$.items[?(@.kind == 'RATING')].rating.mine").value(false))
        mvc.perform(get("/v1/feed").param("kind", "LOAN").param("size", "1"))
            .andExpect(status().isOk).andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].credit.description").value("Вернул"))
    }

    @Test
    fun `pagination reaches old publications beyond the former fifty item cap and filters first`() {
        val page = person("history", "История")
        IntStream.range(0, 65).forEach {
            save(CommentEntity(personId = page.id, text = "Запись $it", createdAt = old.plusSeconds(it.toLong())))
        }
        media(page, MediaKind.PHOTO)
        mvc.perform(get("/v1/feed").param("kind", "WALL").param("page", "5").param("size", "12"))
            .andExpect(status().isOk).andExpect(jsonPath("$.total").value(65))
            .andExpect(jsonPath("$.items.length()").value(5))
            .andExpect(jsonPath("$.items[0].comment.text").value("Запись 4"))
            .andExpect(jsonPath("$.items[4].comment.text").value("Запись 0"))
    }

    @Test
    fun `feed excludes private deleted and unmoderated content including hidden media contexts`() {
        val page = person("public", "Открытая")
        val hidden = person("hidden", "Скрытая", published = false)
        val deleted = person("removed", "Удалённая", deleted = true)
        save(CommentEntity(personId = hidden.id, text = "private"))
        save(RatingEntity(personId = deleted.id))
        save(CommentEntity(personId = page.id, text = "pending", published = false))
        save(CommentEntity(personId = page.id, text = "deleted", deleted = true))
        save(CreditEntryEntity(personId = page.id, published = false))
        val pending = media(page, MediaKind.PHOTO, MediaStatus.PENDING)
        save(CommentEntity(personId = page.id, mediaId = pending.id, text = "hidden context"))
        val wrongPage = media(hidden, MediaKind.PHOTO)
        save(CommentEntity(personId = page.id, mediaId = wrongPage.id, text = "wrong page"))
        media(page, MediaKind.AVATAR)
        save(CommentEntity(personId = page.id, text = "visible", createdAt = old))
        mvc.perform(get("/v1/feed").param("size", "1"))
            .andExpect(status().isOk).andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].comment.text").value("visible"))
    }

    @Test
    fun `game events share pagination and keep each page identity for the same match`() {
        val first = person("one", "Первый")
        val second = person("two", "Второй")
        val firstMatch =
            DotaMatchEntity(
                personId = first.id, matchId = 123, durationSeconds = 1800,
                playedAt = old, score = 40, opponentScore = 20,
            )
        firstMatch.person = first
        save(firstMatch)
        val secondMatch = DotaMatchEntity(personId = second.id, matchId = 123, durationSeconds = 1800, playedAt = old)
        secondMatch.person = second
        save(secondMatch)
        val source = "https://steamcommunity.com/profiles/76561197960265770"
        save(SocialLinkEntity(personId = first.id, network = SocialNetwork.STEAM, value = source))
        save(
            LeetifySyncEntity(
                personId = first.id, sourceUrl = source, snapshotSourceUrl = source,
                importFrom = old, lastCompletedAt = Instant.now(),
            ),
        )
        val cs =
            CsMatchEntity(
                personId = first.id, playedAt = old.plusSeconds(1),
                expiresAt = old,
            )
        cs.person = first
        save(cs)
        save(SocialLinkEntity(personId = second.id, network = SocialNetwork.STEAM, value = source))
        save(
            LeetifySyncEntity(
                personId = second.id, sourceUrl = source, snapshotSourceUrl = source,
                importFrom = old, lastCompletedAt = old,
            ),
        )
        val expired = CsMatchEntity(personId = second.id, expiresAt = old)
        expired.person = second
        save(expired)
        mvc.perform(get("/v1/feed").param("kind", "GAME").param("size", "1"))
            .andExpect(status().isOk).andExpect(jsonPath("$.total").value(3))
            .andExpect(jsonPath("$.items[0].kind").value("CS"))
        mvc.perform(get("/v1/feed").param("kind", "GAME").param("page", "1").param("size", "1"))
            .andExpect(status().isOk).andExpect(jsonPath("$.items[0].kind").value("DOTA"))
        mvc.perform(get("/v1/feed").param("kind", "GAME").param("size", "12"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.items[?(@.page.id == '${first.id}' && @.kind == 'DOTA')].dota.score").value(40))
    }

    @Test
    fun `invalid pagination and filters are rejected instead of silently returning empty pages`() {
        mvc.perform(get("/v1/feed").param("size", "51")).andExpect(status().isBadRequest)
        mvc.perform(get("/v1/feed").param("page", "-1")).andExpect(status().isBadRequest)
        mvc.perform(get("/v1/feed").param("kind", "unknown")).andExpect(status().isBadRequest)
        mvc.perform(get("/v1/persons/directory").param("order", "unknown")).andExpect(status().isBadRequest)
        mvc.perform(get("/v1/persons/directory").param("size", "0")).andExpect(status().isBadRequest)
        mvc.perform(get("/v1/persons/directory").param("size", "61")).andExpect(status().isBadRequest)
    }

    private fun person(tag: String, name: String, published: Boolean = true, deleted: Boolean = false): PersonEntity =
        save(PersonEntity(tag = tag, firstName = name, published = published, deleted = deleted, createdAt = old))

    private fun media(person: PersonEntity, kind: MediaKind, status: MediaStatus = MediaStatus.PUBLISHED): MediaEntity =
        save(
            MediaEntity(
                personId = person.id, kind = kind, status = status,
                objectKey = UUID.randomUUID().toString(), createdAt = old,
            ),
        )

    private fun <T : Any> save(entity: T): T {
        entities.persist(entity)
        entities.flush()
        return entity
    }
}
