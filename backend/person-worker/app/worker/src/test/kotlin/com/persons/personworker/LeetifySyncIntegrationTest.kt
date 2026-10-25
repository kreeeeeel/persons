package com.persons.personworker

import com.persons.dotabuff.SteamAccountResolver
import com.persons.dynamicproperties.component.DynPropertyService
import com.persons.leetify.LeetifyClient
import com.persons.leetify.domain.CsMatchMode
import com.persons.leetify.domain.CsMatchOutcome
import com.persons.leetify.domain.CsPlayerMatch
import com.persons.leetify.exception.LeetifyException
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.SocialLinkEntity
import com.persons.person.domain.SocialNetwork
import com.persons.person.maintenance.dao.repository.LeetifySyncStateRepository
import com.persons.person.maintenance.dao.repository.PersonRecordRepository
import com.persons.person.maintenance.dao.repository.SocialLinkRecordRepository
import com.persons.person.maintenance.games.CsMatchStore
import com.persons.personworker.component.LeetifyGameIntegration
import com.persons.personworker.dao.LeetifySyncRepository
import com.persons.personworker.domain.LeetifySettings
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.transaction.support.TransactionTemplate
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.UUID

@SpringBootTest
@ActiveProfiles("tests")
class LeetifySyncIntegrationTest {
    @Autowired private lateinit var persons: PersonRecordRepository

    @Autowired private lateinit var links: SocialLinkRecordRepository

    @Autowired private lateinit var states: LeetifySyncStateRepository

    @Autowired private lateinit var transactions: TransactionTemplate

    @Autowired private lateinit var matches: CsMatchStore

    @Autowired private lateinit var integration: LeetifyGameIntegration

    @Autowired private lateinit var synchronization: LeetifySyncRepository

    @Autowired private lateinit var properties: DynPropertyService

    @MockitoBean private lateinit var clock: Clock

    @MockitoBean private lateinit var client: LeetifyClient

    @MockitoBean private lateinit var resolver: SteamAccountResolver
    private val now = Instant.parse("2026-10-23T12:00:00Z")
    private val person = UUID.randomUUID()
    private val link = UUID.randomUUID()
    private val source = "https://steamcommunity.com/profiles/76561197960265770"
    private val steam = "76561197960265770"

    @BeforeEach
    fun configure() {
        Mockito.`when`(clock.instant()).thenReturn(now)
        persons.saveAndFlush(
            PersonEntity(id = person, tag = person.toString().take(32), published = true, createdAt = now),
        )
        links.saveAndFlush(
            SocialLinkEntity(id = link, personId = person, network = SocialNetwork.STEAM, value = source),
        )
        Mockito.`when`(resolver.resolve(source)).thenReturn(42)
        properties.update("games.leetify.enabled", "true", null, "test")
    }

    @AfterEach
    fun cleanup() {
        properties.update("games.leetify.enabled", "false", null, "test")
        transactions.executeWithoutResult { matches.delete(person) }
        states.deleteById(person)
        links.deleteById(link)
        persons.deleteById(person)
    }

    @Test
    fun `refresh preserves the archive beyond the recent window and updates matches without duplicates`() {
        val first = match()
        Mockito.`when`(client.matches(steam)).thenReturn(
            listOf(first, first.copy(matchId = UUID.randomUUID(), playedAt = now.minusSeconds(86400))),
        )
        integration.synchronize()
        assertThat(matches.count(person)).isEqualTo(1)
        integration.synchronize()
        Mockito.verify(client, Mockito.times(1)).matches(steam)
        Mockito.`when`(clock.instant()).thenReturn(now.plusSeconds(301))
        val second = match()
        Mockito.`when`(client.matches(steam)).thenReturn(listOf(first.copy(kills = 25), second))
        integration.synchronize()
        assertThat(matches.count(person)).isEqualTo(2)
        assertThat(matches.page(person, 0, 12).single { it.match.matchId == first.matchId }.match.kills).isEqualTo(25)
        Mockito.`when`(clock.instant()).thenReturn(now.plusSeconds(2 * 86400))
        assertThat(matches.count(person)).isZero()
        Mockito.`when`(client.matches(steam)).thenReturn(listOf(second))
        integration.synchronize()
        assertThat(matches.count(person)).isEqualTo(2)
        assertThat(matches.page(person, 0, 12).map { it.match.matchId }).containsExactlyInAnyOrder(
            first.matchId, second.matchId,
        )
    }

    @Test
    fun `a changed Steam account starts a separate archive`() {
        Mockito.`when`(client.matches(steam)).thenReturn(listOf(match()))
        integration.synchronize()
        val nextSteam = "76561197960265771"
        val nextSource = "https://steamcommunity.com/profiles/$nextSteam"
        val row = links.findById(link).orElseThrow()
        row.value = nextSource
        links.saveAndFlush(row)
        Mockito.`when`(clock.instant()).thenReturn(now.plusSeconds(301))
        Mockito.`when`(resolver.resolve(nextSource)).thenReturn(43)
        val next = match().copy(steam64Id = nextSteam)
        Mockito.`when`(client.matches(nextSteam)).thenReturn(listOf(next))
        integration.synchronize()
        assertThat(matches.page(person, 0, 12).single().match.matchId).isEqualTo(next.matchId)
    }

    @Test
    fun `a failed old profile does not starve an unprocessed newer profile after its retry becomes due`() {
        val older = UUID.randomUUID()
        val olderLink = UUID.randomUUID()
        persons.saveAndFlush(
            PersonEntity(
                id = older, tag = older.toString().take(32), published = true,
                createdAt = now.minusSeconds(86400),
            ),
        )
        links.saveAndFlush(
            SocialLinkEntity(
                id = olderLink, personId = older, network = SocialNetwork.STEAM,
                value = "https://steamcommunity.com/profiles/76561197960265771",
            ),
        )
        try {
            val settings = LeetifySettings(true, now, Duration.ofSeconds(300))
            val first = synchronization.candidates(settings, 1).single()
            assertThat(first.personId).isEqualTo(older)
            val lease =
                synchronization.claim(first, settings) ?: throw AssertionError("Expected the oldest due profile")
            synchronization.failed(lease, "HTTP_404", Duration.ofSeconds(60))
            Mockito.`when`(clock.instant()).thenReturn(now.plusSeconds(61))
            assertThat(synchronization.candidates(settings, 1).single().personId).isEqualTo(person)
        } finally {
            states.deleteById(older)
            links.deleteById(olderLink)
            persons.deleteById(older)
        }
    }

    @Test
    fun `rate limits retain the last snapshot but a private profile removes it`() {
        Mockito.`when`(client.matches(steam)).thenReturn(listOf(match()))
        integration.synchronize()
        Mockito.`when`(clock.instant()).thenReturn(now.plusSeconds(301))
        Mockito.`when`(client.matches(steam)).thenThrow(LeetifyException("HTTP_429", Duration.ofSeconds(120)))
        integration.synchronize()
        assertThat(matches.count(person)).isEqualTo(1)
        assertThat(states.findById(person).orElseThrow().lastError).isEqualTo("HTTP_429")
        integration.synchronize()
        Mockito.verify(client, Mockito.times(2)).matches(steam)
        Mockito.`when`(clock.instant()).thenReturn(now.plusSeconds(422))
        Mockito.doThrow(LeetifyException("PROFILE_PRIVATE")).`when`(client).matches(steam)
        integration.synchronize()
        assertThat(matches.count(person)).isZero()
    }

    private fun match(): CsPlayerMatch = CsPlayerMatch(
        UUID.randomUUID(), steam, now, "de_mirage",
        CsMatchMode.PREMIER, CsMatchOutcome.VICTORY, 13, 9, 24, 14, 7, rank = 18500,
    )
}
