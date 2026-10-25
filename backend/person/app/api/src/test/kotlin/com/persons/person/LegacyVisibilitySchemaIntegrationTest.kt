package com.persons.person

import com.persons.person.component.AccountProfiles
import com.persons.person.component.ActorResolver
import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.entity.PersonEntity
import jakarta.persistence.EntityManager
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anySet
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.core.io.ClassPathResource
import org.springframework.jdbc.core.JdbcOperations
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.jdbc.JdbcTestUtils
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import javax.sql.DataSource

@SpringBootTest(
    properties = [
        "spring.datasource.url=\${LEGACY_SCHEMA_TEST_DB_URL:jdbc:h2:mem:legacy;MODE=PostgreSQL;DB_CLOSE_DELAY=-1}",
        "spring.datasource.username=\${LEGACY_SCHEMA_TEST_DB_USER:sa}",
        "spring.datasource.password=\${LEGACY_SCHEMA_TEST_DB_PASSWORD:}",
    ],
)
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class LegacyVisibilitySchemaIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var entities: EntityManager

    @Autowired private lateinit var dataSource: DataSource

    @Autowired private lateinit var jdbc: JdbcOperations

    @MockitoBean private lateinit var actors: ActorResolver

    @MockitoBean private lateinit var accounts: AccountProfiles

    @Test
    fun `published content uses normal moderation rules while retired visibility rows remain untouched`() {
        `when`(actors.optional()).thenReturn(null)
        `when`(accounts.profiles(anySet())).thenReturn(emptyMap())
        val page = PersonEntity(
            id = UUID.fromString("00000000-0000-4000-8000-000000000001"),
            tag = "legacy-visible", firstName = "Visible", description = "Description", published = true,
        )
        val comment = CommentEntity(
            id = UUID.fromString("00000000-0000-4000-8000-000000000002"),
            personId = page.id, text = "Published content",
        )
        entities.persist(page)
        entities.persist(comment)
        entities.flush()
        ResourceDatabasePopulator(ClassPathResource("fixtures/retired-visibility.sql")).execute(dataSource)

        mvc.perform(get("/v1/persons/by-tag/${page.tag}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.description").value("Description"))
        mvc.perform(get("/v1/persons/directory"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].id").value(page.id.toString()))
        mvc.perform(get("/v1/feed"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].comment.text").value("Published content"))
            .andExpect(jsonPath("$.items[0].canManagePrivacy").doesNotExist())

        assertThat(JdbcTestUtils.countRowsInTable(jdbc, "content_privacy")).isEqualTo(3)
        assertThat(JdbcTestUtils.countRowsInTable(jdbc, "content_privacy_recipients")).isEqualTo(1)
    }

    @Test
    fun `retired visibility routes are not exposed`() {
        mvc.perform(get("/v1/privacy/policy")).andExpect(status().isNotFound)
        mvc.perform(get("/v1/privacy/recipients")).andExpect(status().isNotFound)
    }
}
