package com.persons.personworker

import com.persons.person.dao.entity.AchievementEntity
import com.persons.person.dao.entity.PersonAchievementEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.domain.AchievementType
import com.persons.personworker.dao.AutomaticAchievementRepository
import com.persons.personworker.job.AutomaticAchievementJob
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.transaction.support.TransactionTemplate
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit

@SpringBootTest(
    properties = [
        "spring.datasource.url=\${WORKER_POSTGRES_TEST_URL}",
        "spring.datasource.username=tests",
        "spring.datasource.password=tests",
    ],
)
@ActiveProfiles("tests")
@EnabledIfEnvironmentVariable(named = "WORKER_POSTGRES_TEST_URL", matches = ".+")
class AutomaticAchievementIntegrationTest {
    @Autowired private lateinit var fixtures: JpaTestData

    @Autowired private lateinit var achievements: AutomaticAchievementRepository

    @Autowired private lateinit var job: AutomaticAchievementJob

    @Autowired private lateinit var transactions: TransactionTemplate

    @MockitoBean private lateinit var clock: Clock

    private val now = Instant.parse("2026-10-19T12:00:00Z")
    private val personIds = mutableSetOf<UUID>()
    private val achievementIds = mutableSetOf<UUID>()

    @BeforeEach
    fun configureClock() {
        Mockito.`when`(clock.instant()).thenReturn(now)
    }

    @AfterEach
    fun removeOwnFixtures() {
        if (achievementIds.isNotEmpty()) {
            fixtures.delete(PersonAchievementEntity::class.java) { achievementIds.contains(it.achievementId) }
            fixtures.delete(AchievementEntity::class.java) { achievementIds.contains(it.id) }
        }
        if (personIds.isNotEmpty()) {
            fixtures.delete(PersonEntity::class.java) { personIds.contains(it.id) }
        }
    }

    @Test
    fun `grants all earned anniversaries once and excludes unpublished deleted inactive and manual records`() {
        achievement(1)
        achievement(2)
        achievement(3)
        achievement(4)
        achievement(5)
        achievement(1, active = false)
        achievement(null)

        val anniversary = now.atOffset(ZoneOffset.UTC).minusYears(1).toInstant()
        val boundary = person(anniversary)
        val early = person(anniversary.plusSeconds(1))
        val veteran = person(now.atOffset(ZoneOffset.UTC).minusYears(5).toInstant())
        val hidden = person(anniversary, published = false)
        val deleted = person(anniversary, deleted = true)

        assertThat(achievements.grantDue(now, 100)).isEqualTo(6)
        assertThat(count(boundary)).isEqualTo(1)
        assertThat(count(veteran)).isEqualTo(5)
        assertThat(count(early)).isZero()
        assertThat(count(hidden)).isZero()
        assertThat(count(deleted)).isZero()
        assertThat(achievements.grantDue(now, 100)).isZero()
        assertThat(
            fixtures.all(PersonAchievementEntity::class.java).stream()
                .filter {
                    it.personId == veteran &&
                        it.assignedBy == null &&
                        it.assignedAt == now
                }.count(),
        ).isEqualTo(5)
    }

    @Test
    fun `uses the full calendar anniversary for leap-day pages`() {
        achievement(1)
        val page = person(Instant.parse("2020-02-29T12:00:00Z"))
        val anniversary = Instant.parse("2021-02-28T12:00:00Z")

        assertThat(achievements.grantDue(anniversary.minusSeconds(1), 100)).isZero()
        assertThat(achievements.grantDue(anniversary, 100)).isEqualTo(1)
        assertThat(count(page)).isEqualTo(1)
    }

    @Test
    fun `limits each batch and continues with the remaining pages`() {
        achievement(1)
        val createdAt = now.atOffset(ZoneOffset.UTC).minusYears(2).toInstant()
        person(createdAt)
        person(createdAt)
        person(createdAt)

        assertThat(achievements.grantDue(now, 2)).isEqualTo(2)
        assertThat(achievements.grantDue(now, 2)).isEqualTo(1)
        assertThat(achievements.grantDue(now, 2)).isZero()
    }

    @Test
    fun `parallel workers do not duplicate an award and skip a definition being edited`() {
        val definition = achievement(1)
        val page = person(now.atOffset(ZoneOffset.UTC).minusYears(1).toInstant())
        transactions.executeWithoutResult {
            fixtures.lock(AchievementEntity::class.java, definition)
            val skipped = CompletableFuture.supplyAsync { achievements.grantDue(now, 100) }
            assertThat(skipped.get(5, TimeUnit.SECONDS)).isZero()
        }
        val first = CompletableFuture.supplyAsync { achievements.grantDue(now, 100) }
        val second = CompletableFuture.supplyAsync { achievements.grantDue(now, 100) }

        assertThat(first.get(5, TimeUnit.SECONDS) + second.get(5, TimeUnit.SECONDS)).isEqualTo(1)
        assertThat(count(page)).isEqualTo(1)
    }

    @Test
    fun `the scheduled job uses the shared clock and the automatic grant store`() {
        achievement(1)
        val page = person(now.atOffset(ZoneOffset.UTC).minusYears(1).toInstant())

        job.run()
        job.run()

        assertThat(count(page)).isEqualTo(1)
    }

    private fun person(createdAt: Instant, published: Boolean = true, deleted: Boolean = false): UUID {
        val id = UUID.randomUUID()
        fixtures.save(
            PersonEntity(
                id = id,
                tag = id.toString().take(32),
                firstName = "Test",
                lastName = "Anniversary",
                description = "",
                published = published,
                deleted = deleted,
                createdAt = createdAt,
            ),
        )
        personIds.add(id)
        return id
    }

    private fun achievement(years: Int?, active: Boolean = true): UUID {
        val id = UUID.randomUUID()
        fixtures.save(
            AchievementEntity(
                id = id,
                title = "Test anniversary",
                description = "",
                imageObjectKey = "tests/$id",
                imageContentType = "image/png",
                imageSize = 1,
                active = active,
                createdAt = now,
                type = AchievementType.valueOf(if (years == null) "MANUAL" else "AUTOMATIC"),
                pageAgeYears = years,
            ),
        )
        achievementIds.add(id)
        return id
    }

    private fun count(personId: UUID): Long = fixtures.all(PersonAchievementEntity::class.java).stream()
        .filter {
            it.personId == personId
        }.count()
}
