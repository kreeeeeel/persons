package com.persons.person

import com.persons.dotabuff.domain.DotaItem
import com.persons.dotabuff.domain.DotaPlayerMatch
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.maintenance.games.DotaMatchStore
import jakarta.persistence.EntityManager
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class DotaGameQueryIntegrationTest {
    @Autowired private lateinit var fixtures: JpaTestData

    @Autowired private lateinit var matches: DotaMatchStore

    @Autowired private lateinit var mvc: MockMvc

    @Autowired private lateinit var entities: EntityManager

    @Test
    fun `history and feed expose persisted matches with items while hidden pages stay private`() {
        val person = UUID.randomUUID()
        val now = Instant.parse("2026-10-22T00:00:00Z")
        fixtures.save(
            PersonEntity(
                id = person,
                tag = person.toString().take(32),
                firstName = "Test",
                lastName = "Player",
                description = "",
                published = true,
                createdAt = now,
            ),
        )
        matches.insert(
            person,
            DotaPlayerMatch(
                123, 42, now, 2538, "juggernaut", "Juggernaut", true, 18, 4, 12, null,
                listOf(DotaItem("battle-fury", "Battle Fury", 0, 924)),
                heroDamage = 34825, buildingDamage = 8321,
                neutralItem = DotaItem("telescope", "Telescope", 6, 2235),
                score = 51, opponentScore = 42,
            ),
        )
        mvc.perform(get("/v1/persons/$person/games/dota2/matches"))
            .andExpect(status().isOk).andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].matchUrl").value("https://www.opendota.com/matches/123"))
            .andExpect(jsonPath("$.items[0].items[0].name").value("Battle Fury"))
            .andExpect(jsonPath("$.items[0].items[0].acquiredAtSeconds").value(924))
            .andExpect(jsonPath("$.items[0].heroDamage").value(34825))
            .andExpect(jsonPath("$.items[0].buildingDamage").value(8321))
            .andExpect(jsonPath("$.items[0].score").value(51))
            .andExpect(jsonPath("$.items[0].opponentScore").value(42))
            .andExpect(jsonPath("$.items[0].neutralItem.id").value("telescope"))
            .andExpect(jsonPath("$.items[0].neutralItem.acquiredAtSeconds").value(2235))
        mvc.perform(get("/v1/games/dota2/events")).andExpect(status().isOk)
            .andExpect(jsonPath("$.items[?(@.page.id == '$person')].match.id").value("123"))
        mvc.perform(get("/v1/persons/$person/games/dota2/matches/123"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.items[0].name").value("Battle Fury"))
            .andExpect(jsonPath("$.neutralItem.id").value("telescope"))
            .andExpect(jsonPath("$.score").value(51))
        mvc.perform(get("/v1/persons/$person/games/dota2/matches").param("size", "61"))
            .andExpect(status().isBadRequest)
        fixtures.update(PersonEntity::class.java, { it.id == person }) { row ->
            row.published = false
        }
        entities.clear()
        mvc.perform(get("/v1/persons/$person/games/dota2/matches")).andExpect(status().isNotFound)
        mvc.perform(get("/v1/persons/$person/games/dota2/matches/123")).andExpect(status().isNotFound)
        mvc.perform(get("/v1/games/dota2/events")).andExpect(status().isOk)
            .andExpect(jsonPath("$.items[?(@.page.id == '$person')]").isEmpty)
    }

    @Test
    fun `direct Dota links isolate player records and validate identifiers independently of pagination`() {
        val first = fixtures.save(PersonEntity(tag = "first-game", published = true))
        val other = fixtures.save(PersonEntity(tag = "other-game", published = true))
        val old = DotaPlayerMatch(
            123, 42, Instant.parse("2024-01-01T00:00:00Z"), 1800,
            "juggernaut", "Juggernaut", true, 10, 3, 4, null, emptyList(),
        )
        matches.insert(first.id, old)
        matches.insert(first.id, old.copy(matchId = 124, playedAt = old.playedAt.plusSeconds(60)))
        matches.insert(other.id, old.copy(kills = 2))
        mvc.perform(get("/v1/persons/${first.id}/games/dota2/matches").param("size", "1"))
            .andExpect(jsonPath("$.items[0].id").value("124"))
        mvc.perform(get("/v1/persons/${first.id}/games/dota2/matches/123"))
            .andExpect(status().isOk).andExpect(jsonPath("$.kills").value(10))
        mvc.perform(get("/v1/persons/${other.id}/games/dota2/matches/123"))
            .andExpect(status().isOk).andExpect(jsonPath("$.kills").value(2))
        mvc.perform(get("/v1/persons/${other.id}/games/dota2/matches/124")).andExpect(status().isNotFound)
        listOf("0", "-1", "001", "9223372036854775808", "invalid").stream().forEach { invalid ->
            mvc.perform(get("/v1/persons/${first.id}/games/dota2/matches/$invalid"))
                .andExpect(status().isBadRequest)
        }
    }
}
