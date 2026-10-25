package com.persons.person

import com.persons.person.component.ActorResolver
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.Actor
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
import java.util.UUID

@SpringBootTest(
    properties = [
        "spring.datasource.url=\${PUBLICATIONS_TEST_DB_URL:jdbc:h2:mem:recommendations;MODE=PostgreSQL;DB_CLOSE_DELAY=-1}",

        "spring.datasource.username=\${PUBLICATIONS_TEST_DB_USER:sa}",
        "spring.datasource.password=\${PUBLICATIONS_TEST_DB_PASSWORD:}",
    ],
)
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class PersonRecommendationsIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var persons: PersonRepository

    @MockitoBean private lateinit var actors: ActorResolver

    @Test
    fun `only other published pages are recommended even if caller supplies another owner`() {
        val actor = Actor(UUID.randomUUID(), "Пользователь", false)
        `when`(actors.optional()).thenReturn(actor)
        persons.saveAllAndFlush(
            listOf(
                PersonEntity(tag = "own", ownerAccountId = actor.id, published = true),
                PersonEntity(tag = "private", published = false),
                PersonEntity(tag = "deleted", published = true, deleted = true),
                PersonEntity(tag = "friend", firstName = "Друг", published = true),
                PersonEntity(tag = "other", published = true, ownerAccountId = UUID.randomUUID()),
            ),
        )
        mvc.perform(
            get("/v1/persons/recommendations").param("size", "6").param("ownerId", UUID.randomUUID().toString()),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[?(@.tag == 'own')]").isEmpty)
            .andExpect(jsonPath("$[?(@.tag == 'private')]").isEmpty)
            .andExpect(jsonPath("$[?(@.tag == 'deleted')]").isEmpty)
        mvc.perform(get("/v1/persons/recommendations").param("size", "1"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
    }

    @Test
    fun `empty catalog returns an empty sample and size is validated`() {
        mvc.perform(get("/v1/persons/recommendations"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(0))
        mvc.perform(get("/v1/persons/recommendations").param("size", "7"))
            .andExpect(status().isBadRequest)
    }
}
