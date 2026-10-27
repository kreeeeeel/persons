package com.persons.personworker

import com.persons.dotabuff.DotaClient
import com.persons.dotabuff.SteamAccountResolver
import com.persons.dotabuff.domain.DotaItem
import com.persons.dotabuff.domain.DotaMatchPage
import com.persons.dotabuff.domain.DotaMatchReference
import com.persons.dotabuff.domain.DotaPlayerMatch
import com.persons.dotabuff.exception.DotabuffException
import com.persons.dynamicproperties.component.DynPropertyService
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.SocialLinkEntity
import com.persons.person.domain.SocialNetwork
import com.persons.person.maintenance.dao.entity.DotaItemEntity
import com.persons.person.maintenance.dao.entity.DotaMatchEntity
import com.persons.person.maintenance.dao.entity.DotaSyncEntity
import com.persons.person.maintenance.games.DotaMatchStore
import com.persons.personworker.component.DotabuffGameIntegration
import com.persons.personworker.component.DotabuffSettingsProvider
import com.persons.personworker.dao.DotaSyncRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.UUID

@SpringBootTest
@ActiveProfiles("tests")
class DotaSyncIntegrationTest {
    @Autowired private lateinit var fixtures: JpaTestData

    @Autowired private lateinit var integration: DotabuffGameIntegration

    @Autowired private lateinit var states: DotaSyncRepository

    @Autowired private lateinit var settings: DotabuffSettingsProvider

    @Autowired private lateinit var matches: DotaMatchStore

    @Autowired private lateinit var properties: DynPropertyService

    @MockitoBean private lateinit var clock: Clock

    @MockitoBean private lateinit var client: DotaClient

    @MockitoBean private lateinit var resolver: SteamAccountResolver
    private val now = Instant.parse("2026-10-22T12:00:00Z")
    private val person = UUID.randomUUID()
    private val source = "https://steamcommunity.com/profiles/76561197960265770"

    @BeforeEach
    fun configure() {
        Mockito.`when`(clock.instant()).thenReturn(now)
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
        fixtures.save(
            SocialLinkEntity(
                id = UUID.randomUUID(),
                personId = person,
                network = SocialNetwork.STEAM,
                value = source,
            ),
        )
        properties.update("games.dotabuff.enabled", "true", null, "test")
    }

    @AfterEach
    fun cleanup() {
        fixtures.delete(DotaItemEntity::class.java) { it.personId == person }
        fixtures.delete(DotaMatchEntity::class.java) { it.personId == person }
        fixtures.delete(DotaSyncEntity::class.java) { it.personId == person }
        fixtures.delete(SocialLinkEntity::class.java) { it.personId == person }
        fixtures.delete(PersonEntity::class.java) { it.id == person }
        properties.update("games.dotabuff.enabled", "false", null, "test")
    }

    @Test
    fun `repairs cached average ranks without replacing existing stats or inventory`() {
        val reference = DotaMatchReference(321, now.minusSeconds(60))
        fixtures.save(
            DotaMatchEntity(
                personId = person, matchId = 321, accountId = 42,
                playedAt = reference.playedAt, durationSeconds = 2500, heroKey = "juggernaut", heroName = "Juggernaut",
                kills = 7, deaths = 2, assists = 5, rankName = "Divine 5",
            ),
        )
        fixtures.save(DotaItemEntity(person, 321, 0, "blink", "Blink Dagger", 60))
        assertThat(matches.page(person, 0, 12).single().match.rank).isNull()
        Mockito.`when`(resolver.resolve(source)).thenReturn(42)
        Mockito.`when`(client.matches(42, 1)).thenReturn(DotaMatchPage(listOf(reference), false))
        Mockito.`when`(client.match(42, reference)).thenReturn(
            DotaPlayerMatch(
                321, 42, reference.playedAt, 2538, "juggernaut", "Juggernaut", true,
                99, 1, 1, "Archon 3", emptyList(),
            ),
        )
        integration.synchronize()
        val repaired = matches.page(person, 0, 12).single().match
        assertThat(repaired.rank).isEqualTo("Archon 3")
        assertThat(repaired.kills).isEqualTo(7)
        assertThat(repaired.items.single().name).isEqualTo("Blink Dagger")
        assertThat(matches.ranksToRepair(person, 42, 5)).isEmpty()
        Mockito.verify(client, Mockito.times(1)).match(42, reference)
    }

    @Test
    fun `imports eligible matches once and preserves pagination for a later run`() {
        val reference = DotaMatchReference(123, now.minusSeconds(60))
        Mockito.`when`(resolver.resolve(source)).thenReturn(42)
        Mockito.`when`(client.matches(42, 1)).thenReturn(DotaMatchPage(listOf(reference), true))
        Mockito.`when`(client.matches(42, 2)).thenReturn(DotaMatchPage(emptyList(), false))
        Mockito.`when`(client.match(42, reference)).thenReturn(
            DotaPlayerMatch(
                123, 42, reference.playedAt, 2538, "juggernaut", "Juggernaut",
                true, 18, 4, 12, null, listOf(DotaItem("battle-fury", "Battle Fury", 0)),
            ),
        )
        integration.synchronize()
        assertThat(matches.count(person)).isEqualTo(1)
        assertThat(matches.page(person, 0, 12).single().match.items.single().name).isEqualTo("Battle Fury")
        integration.synchronize()
        assertThat(matches.count(person)).isEqualTo(1)
        integration.synchronize()
        Mockito.verify(client, Mockito.times(1)).match(42, reference)
        Mockito.verify(client, Mockito.times(1)).matches(42, 2)
    }

    @Test
    fun `leases exclude a second worker and failed fetches retain the import cursor`() {
        val candidate = states.candidates(settings.dotabuff(), 5).single { it.personId == person }
        val lease = states.claim(candidate, settings.dotabuff())
        if (lease == null) {
            throw AssertionError("The due profile must be claimed")
        }
        assertThat(states.claim(candidate, settings.dotabuff())).isNull()
        states.failed(lease, "HTTP_429", Duration.ZERO)
        Mockito.`when`(resolver.resolve(source)).thenReturn(42)
        Mockito.`when`(client.matches(42, 1)).thenThrow(DotabuffException("HTTP_403"))
        integration.synchronize()
        assertThat(matches.count(person)).isZero()
        assertThat(
            fixtures.all(DotaSyncEntity::class.java).stream()
                .filter {
                    it.personId == person
                }.toList().singleOrNull()?.nextPage,
        )
            .isEqualTo(1)
        assertThat(
            fixtures.all(DotaSyncEntity::class.java).stream()
                .filter {
                    it.personId == person
                }.toList().singleOrNull()?.lastCompletedAt,
        )
            .isNull()
    }
}
