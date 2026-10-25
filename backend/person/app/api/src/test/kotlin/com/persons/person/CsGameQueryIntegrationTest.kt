package com.persons.person

import com.persons.leetify.domain.CsMatchMode
import com.persons.leetify.domain.CsMatchOutcome
import com.persons.leetify.domain.CsPlayerMatch
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.SocialLinkEntity
import com.persons.person.domain.SocialNetwork
import com.persons.person.maintenance.dao.entity.LeetifySyncEntity
import com.persons.person.maintenance.dao.repository.LeetifySyncStateRepository
import com.persons.person.maintenance.dao.repository.PersonRecordRepository
import com.persons.person.maintenance.dao.repository.SocialLinkRecordRepository
import com.persons.person.maintenance.games.CsMatchStore
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito
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
import java.time.Clock
import java.time.Instant
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("tests")
@Transactional
class CsGameQueryIntegrationTest {
    @Autowired private lateinit var persons: PersonRecordRepository

    @Autowired private lateinit var links: SocialLinkRecordRepository

    @Autowired private lateinit var states: LeetifySyncStateRepository

    @Autowired private lateinit var matches: CsMatchStore

    @Autowired private lateinit var mvc: MockMvc

    @MockitoBean private lateinit var clock: Clock
    private val now = Instant.parse("2026-10-23T12:00:00Z")
    private val person = UUID.randomUUID()
    private val source = "https://steamcommunity.com/profiles/76561197960265770"

    @BeforeEach
    fun configure() {
        Mockito.`when`(clock.instant()).thenReturn(now)
        persons.saveAndFlush(PersonEntity(id = person, tag = person.toString().take(32), published = true))
        links.saveAndFlush(SocialLinkEntity(personId = person, network = SocialNetwork.STEAM, value = source))
        states.saveAndFlush(
            LeetifySyncEntity(
                personId = person, sourceUrl = source, snapshotSourceUrl = source,
                importFrom = now, lastCompletedAt = now,
            ),
        )
    }

    @Test
    fun `history and feed expose CS matches and preserve missing provider values`() {
        val id = UUID.randomUUID()
        matches.merge(
            person,
            listOf(
                CsPlayerMatch(
                    id, "76561197960265770", now, "de_mirage",
                    CsMatchMode.FACEIT, CsMatchOutcome.VICTORY, 13, 9, 24, 14, 7,
                    faceitLevel = 9, faceitElo = 2450, kd = 1.71, adr = 95.3, hsPercent = 50.0,
                ),
            ),
        )
        mvc.perform(get("/v1/persons/$person/games/cs2/matches"))
            .andExpect(status().isOk).andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.items[0].mapName").value("de_mirage"))
            .andExpect(jsonPath("$.items[0].faceitLevel").value(9))
            .andExpect(jsonPath("$.items[0].faceitElo").value(2450))
            .andExpect(jsonPath("$.items[0].durationSeconds").doesNotExist())
            .andExpect(jsonPath("$.items[0].personalPerformance").doesNotExist())
            .andExpect(jsonPath("$.items[0].matchUrl").value("https://leetify.com/app/match-details/$id"))
        mvc.perform(get("/v1/games/cs2/events")).andExpect(status().isOk)
            .andExpect(jsonPath("$.items[?(@.page.id == '$person')].match.id").value(id.toString()))
        mvc.perform(get("/v1/persons/$person/games/cs2/matches/$id"))
            .andExpect(status().isOk).andExpect(jsonPath("$.mapName").value("de_mirage"))
        mvc.perform(get("/v1/persons/$person/games/cs2/matches").param("size", "61")).andExpect(status().isBadRequest)
        matches.merge(person, emptyList())
        mvc.perform(get("/v1/persons/$person/games/cs2/matches")).andExpect(jsonPath("$.total").value(1))
        mvc.perform(get("/v1/persons/$person/games/cs2/matches/$id")).andExpect(status().isOk)
        matches.delete(person)
        mvc.perform(get("/v1/persons/$person/games/cs2/matches")).andExpect(jsonPath("$.total").value(0))
        mvc.perform(get("/v1/persons/$person/games/cs2/matches/$id")).andExpect(status().isNotFound)
    }

    @Test
    fun `expired snapshots and changed Steam links are excluded from public results`() {
        val id = UUID.randomUUID()
        matches.merge(
            person,
            listOf(
                CsPlayerMatch(
                    id, "76561197960265770", now,
                    "de_nuke", CsMatchMode.WINGMAN, CsMatchOutcome.DRAW, 9, 9, 12, 12, 3,
                ),
            ),
        )
        Mockito.`when`(clock.instant()).thenReturn(now.plusSeconds(86401))
        mvc.perform(get("/v1/persons/$person/games/cs2/matches")).andExpect(jsonPath("$.total").value(0))
        mvc.perform(get("/v1/persons/$person/games/cs2/matches/$id")).andExpect(status().isNotFound)
        Mockito.`when`(clock.instant()).thenReturn(now)
        val link = links.findAll().single { it.personId == person }
        link.value = "https://steamcommunity.com/profiles/76561197960265771"
        links.saveAndFlush(link)
        mvc.perform(get("/v1/persons/$person/games/cs2/matches")).andExpect(jsonPath("$.total").value(0))
        mvc.perform(get("/v1/persons/$person/games/cs2/matches/$id")).andExpect(status().isNotFound)
        val owner = persons.getReferenceById(person)
        owner.published = false
        persons.saveAndFlush(owner)
        mvc.perform(get("/v1/persons/$person/games/cs2/matches")).andExpect(status().isNotFound)
        mvc.perform(get("/v1/persons/$person/games/cs2/matches/$id")).andExpect(status().isNotFound)
    }

    @Test
    fun `direct CS links isolate player records and reach matches outside the first history page`() {
        val match = CsPlayerMatch(
            UUID.randomUUID(), "76561197960265770", now.minusSeconds(86400 * 30),
            "de_mirage", CsMatchMode.FACEIT, CsMatchOutcome.VICTORY, 13, 9, 24, 14, 7,
        )
        matches.merge(person, listOf(match, match.copy(matchId = UUID.randomUUID(), playedAt = now)))
        val other = persons.saveAndFlush(PersonEntity(tag = "other-cs", published = true))
        links.saveAndFlush(SocialLinkEntity(personId = other.id, network = SocialNetwork.STEAM, value = source))
        states.saveAndFlush(
            LeetifySyncEntity(
                personId = other.id, sourceUrl = source, snapshotSourceUrl = source,
                importFrom = now, lastCompletedAt = now,
            ),
        )
        matches.merge(other.id, listOf(match.copy(kills = 2)))
        mvc.perform(get("/v1/persons/$person/games/cs2/matches").param("size", "1"))
            .andExpect(jsonPath("$.items[0].playedAt").value(now.toString()))
        mvc.perform(get("/v1/persons/$person/games/cs2/matches/${match.matchId}"))
            .andExpect(status().isOk).andExpect(jsonPath("$.kills").value(24))
        mvc.perform(get("/v1/persons/${other.id}/games/cs2/matches/${match.matchId}"))
            .andExpect(status().isOk).andExpect(jsonPath("$.kills").value(2))
        mvc.perform(get("/v1/persons/$person/games/cs2/matches/${UUID.randomUUID()}"))
            .andExpect(status().isNotFound)
        mvc.perform(get("/v1/persons/$person/games/cs2/matches/invalid"))
            .andExpect(status().isBadRequest)
    }
}
