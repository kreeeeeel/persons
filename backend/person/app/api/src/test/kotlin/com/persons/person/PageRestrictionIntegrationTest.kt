package com.persons.person

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.component.AccountProfiles
import com.persons.person.component.ActorResolver
import com.persons.person.component.PersonMediaStore
import com.persons.person.contract.dto.PageRestrictionInput
import com.persons.person.contract.dto.PageRestrictionScope
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.PageRestrictionEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.domain.Actor
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.UnauthorizedException
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.EnumSource
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.util.Base64
import java.util.UUID

@SpringBootTest(properties = ["spring.datasource.url=jdbc:h2:mem:page-policy;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"])
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class PageRestrictionIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var fixtures: JpaTestData

    @Autowired private lateinit var mapper: ObjectMapper

    @MockitoBean private lateinit var actors: ActorResolver

    @MockitoBean private lateinit var accounts: AccountProfiles

    @MockitoBean private lateinit var store: PersonMediaStore

    @MockitoBean private lateinit var clock: Clock
    private val admin = Actor(UUID.randomUUID(), "Модератор", true)
    private val author = Actor(UUID.randomUUID(), "Автор", false)
    private var current: Actor? = admin
    private val now = Instant.parse("2026-10-21T12:00:00Z")

    @BeforeEach
    fun authenticate() {
        `when`(clock.instant()).thenReturn(now)
        `when`(actors.optional()).thenAnswer { current }
        `when`(actors.required()).thenAnswer { current ?: throw UnauthorizedException() }
        `when`(actors.administrator()).thenAnswer {
            val actor = current ?: throw UnauthorizedException()
            if (!actor.administrator) throw ForbiddenException()
            actor
        }
    }

    @Test
    fun `a comment restriction applies only to its author and page including media and rating reviews`() {
        val page = person()
        val otherPage = person()
        val video = video(page)
        set(page, PageRestrictionScope.COMMENTS)
        current = author
        mvc.perform(post("/v1/persons/$page/comments").json(mapOf("text" to "Текст")))
            .andExpect(status().isForbidden)
            .andExpect(jsonPath("$.code").value("PAGE_ACTION_RESTRICTED"))
        mvc.perform(post("/v1/persons/$page/comments").json(mapOf("text" to "Текст", "mediaId" to video)))
            .andExpect(status().isForbidden)
        mvc.perform(put("/v1/persons/$page/rating").json(mapOf("value" to 5, "emoji" to "🔥", "comment" to "Текст")))
            .andExpect(status().isForbidden)
        mvc.perform(put("/v1/persons/$page/rating").json(mapOf("value" to 5, "emoji" to "🔥")))
            .andExpect(status().isOk)
        mvc.perform(post("/v1/persons/$otherPage/comments").json(mapOf("text" to "Можно на другой странице")))
            .andExpect(status().isAccepted)
        current = Actor(UUID.randomUUID(), "Другой автор", false)
        mvc.perform(post("/v1/persons/$page/comments").json(mapOf("text" to "Можно другому автору")))
            .andExpect(status().isAccepted)
    }

    @ParameterizedTest
    @EnumSource(PageRestrictionScope::class)
    fun `each selected action is enforced by the write service`(scope: PageRestrictionScope) {
        val page = person(author.id)
        val video = video(page)
        set(page, scope)
        current = author
        val request = when (scope) {
            PageRestrictionScope.COMMENTS -> post("/v1/persons/$page/comments").json(mapOf("text" to "Комментарий"))
            PageRestrictionScope.RATINGS -> put("/v1/persons/$page/rating").json(mapOf("value" to 5, "emoji" to "🔥"))
            PageRestrictionScope.LOANS -> post("/v1/persons/$page/credit").json(
                mapOf("kind" to "ON_TIME", "description" to "Займ"),
            )
            PageRestrictionScope.MEDIA -> multipart("/v1/persons/$page/media")
                .file(MockMultipartFile("file", "photo.png", "image/png", png())).param("kind", "PHOTO")
            PageRestrictionScope.PROFILE -> put("/v1/persons/$page").json(
                mapOf(
                    "tag" to "test-page", "firstName" to "Тест", "lastName" to "Страница", "description" to "Текст",
                    "tags" to emptyList<String>(), "socialLinks" to emptyList<String>(),
                    "ratingOptions" to listOf(mapOf("emoji" to "🔥", "label" to "Огонь")), "version" to 0,
                ),
            )
            PageRestrictionScope.REACTIONS -> put("/v1/media/$video/reaction").json(mapOf("reaction" to "LIKE"))
        }
        mvc.perform(request)
            .andExpect(status().isForbidden)
            .andExpect(jsonPath("$.code").value("PAGE_ACTION_RESTRICTED"))
    }

    @Test
    fun `expiry and administrator revocation restore access and management is protected`() {
        val page = person()
        val id = set(page, PageRestrictionScope.COMMENTS, now.plusSeconds(60))
        current = author
        mvc.perform(get("/v1/admin/users/${author.id}/page-restrictions"))
            .andExpect(status().isForbidden)
        mvc.perform(post("/v1/persons/$page/comments").json(mapOf("text" to "Пока нельзя")))
            .andExpect(status().isForbidden)
        `when`(clock.instant()).thenReturn(now.plusSeconds(61))
        mvc.perform(post("/v1/persons/$page/comments").json(mapOf("text" to "Срок истёк")))
            .andExpect(status().isAccepted)
        current = admin
        mvc.perform(get("/v1/admin/users/${author.id}/page-restrictions"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.items[0].active").value(false))
        set(page, PageRestrictionScope.COMMENTS)
        mvc.perform(delete("/v1/admin/users/${UUID.randomUUID()}/page-restrictions/$id"))
            .andExpect(status().isNotFound)
        mvc.perform(delete("/v1/admin/users/${author.id}/page-restrictions/$id"))
            .andExpect(status().isNoContent)
        current = author
        mvc.perform(post("/v1/persons/$page/comments").json(mapOf("text" to "Ограничение снято")))
            .andExpect(status().isAccepted)
    }

    @Test
    fun `active page restriction catalog filters before pagination and excludes expired entries`() {
        val active = person()
        set(active, PageRestrictionScope.COMMENTS)
        set(person(), PageRestrictionScope.MEDIA, now.plusSeconds(30))
        set(person(), PageRestrictionScope.RATINGS)
        fixtures.update(PageRestrictionEntity::class.java, { it.personId == active }) { row ->
            row.reason = "Спам 100%"
        }
        `when`(clock.instant()).thenReturn(now.plusSeconds(60))
        mvc.perform(get("/v1/admin/page-restrictions").param("q", "100%").param("size", "1"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].personId").value(active.toString()))
        mvc.perform(get("/v1/admin/page-restrictions").param("size", "1"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(2))
            .andExpect(jsonPath("$.items.length()").value(1))
        current = author
        mvc.perform(get("/v1/admin/page-restrictions")).andExpect(status().isForbidden)
    }

    private fun set(page: UUID, scope: PageRestrictionScope, expires: Instant? = null): UUID {
        current = admin
        val response = mvc.perform(
            put("/v1/admin/users/${author.id}/page-restrictions").json(
                PageRestrictionInput(page, setOf(scope), "Нарушение правил", expires?.atOffset(ZoneOffset.UTC)),
            ),
        )
            .andExpect(status().isOk).andReturn().response.contentAsString
        return UUID.fromString(mapper.readTree(response).path("id").asText())
    }

    private fun person(owner: UUID? = null): UUID {
        val id = UUID.randomUUID()
        fixtures.save(
            PersonEntity(
                id = id,
                tag = "page-${id.toString().take(8)}",
                firstName = "Тест",
                lastName = "Страница",
                description = "",
                ownerAccountId = owner,
                published = true,
                createdAt = now,
            ),
        )
        return id
    }

    private fun video(person: UUID): UUID {
        val id = UUID.randomUUID()
        fixtures.save(
            MediaEntity(
                id = id,
                personId = person,
                uploaderId = author.id,
                uploaderName = "Автор",
                kind = MediaKind.MOMENT,
                status = MediaStatus.PUBLISHED,
                objectKey = id.toString(),
                contentType = "video/quicktime",
                sizeBytes = 16,
                caption = "",
                createdAt = now,
            ),
        )
        return id
    }

    private fun png(): ByteArray = Base64.getDecoder().decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6lk0AAAAASUVORK5CYII=",
    )

    private fun MockHttpServletRequestBuilder.json(value: Any) =
        contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(value))
}
