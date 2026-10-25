package com.persons.restrictions

import com.persons.restrictions.component.RestrictionComponent
import com.persons.restrictions.dao.entity.AccountRestrictionEntity
import com.persons.restrictions.domain.Administrator
import com.persons.restrictions.domain.RestrictionChange
import com.persons.restrictions.domain.RestrictionScope
import com.persons.restrictions.service.RestrictionStore
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.context.bean.override.mockito.MockitoBean
import java.time.Clock
import java.time.Instant
import java.util.UUID
import java.util.concurrent.TimeUnit

private val TEST_NOW = Instant.parse("2026-10-20T12:00:00Z")
private val CACHE_ADMINISTRATOR = Administrator(UUID.fromString("8e603775-438b-4c91-97bb-9f4f22169166"))

@SpringBootTest
@ActiveProfiles("tests")
@EnabledIfEnvironmentVariable(named = "RESTRICTIONS_POSTGRES_TEST_URL", matches = ".+")
class RestrictionPostgresRedisIntegrationTest {
    @Autowired private lateinit var restrictions: RestrictionComponent

    @Autowired private lateinit var store: RestrictionStore

    @Autowired private lateinit var redis: StringRedisTemplate

    @Autowired private lateinit var fixtures: JpaTestData

    @MockitoBean private lateinit var clock: Clock

    @BeforeEach
    fun prepare() {
        // The parent entity removes its element collection.
        fixtures.delete(AccountRestrictionEntity::class.java) { true }
        Mockito.`when`(clock.instant()).thenReturn(TEST_NOW)
    }

    @Test
    fun `PostgreSQL revision invalidates real Redis entry after scope-only edit and revocation`() {
        val userId = UUID.randomUUID()
        val first = restrictions.set(userId, change(RestrictionScope.COMMENTS), CACHE_ADMINISTRATOR)
        val firstKey = "persons:restrictions:v1:$userId:${first.revision}"
        assertThat(restrictions.current(userId)?.scopes).containsExactly(RestrictionScope.COMMENTS)
        assertThat(redis.hasKey(firstKey)).isTrue()
        val edited = restrictions.set(userId, change(RestrictionScope.MEDIA), CACHE_ADMINISTRATOR)
        assertThat(edited.revision).isGreaterThan(first.revision)
        assertThat(restrictions.current(userId)?.scopes).containsExactly(RestrictionScope.MEDIA)
        assertThat(redis.hasKey(firstKey)).isTrue()
        restrictions.revoke(userId, CACHE_ADMINISTRATOR)
        assertThat(restrictions.current(userId)).isNull()
    }

    @Test
    fun `cached restriction expires by clock even before Redis TTL and expiry job`() {
        val userId = UUID.randomUUID()
        val restriction = restrictions.set(
            userId,
            RestrictionChange(setOf(RestrictionScope.ACCOUNT), "Temporary test restriction", TEST_NOW.plusSeconds(20)),
            CACHE_ADMINISTRATOR,
        )
        val key = "persons:restrictions:v1:$userId:${restriction.revision}"
        assertThat(restrictions.current(userId)).isNotNull()
        assertThat(redis.getExpire(key, TimeUnit.MILLISECONDS)).isBetween(1L, 20_000L)
        Mockito.`when`(clock.instant()).thenReturn(TEST_NOW.plusSeconds(21))
        assertThat(redis.hasKey(key)).isTrue()
        assertThat(restrictions.current(userId)).isNull()
        assertThat(restrictions.expire()).isEqualTo(1)
        assertThat(store.revision(userId)).isGreaterThan(restriction.revision)
        assertThat(restrictions.current(userId)).isNull()
        assertThat(redis.hasKey("persons:restrictions:v1:$userId:${store.revision(userId)}")).isTrue()
    }

    private fun change(scope: RestrictionScope): RestrictionChange =
        RestrictionChange(setOf(scope), "Test restriction", null)

    companion object {
        @JvmStatic
        @DynamicPropertySource
        fun database(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url") { System.getenv("RESTRICTIONS_POSTGRES_TEST_URL") }
            registry.add("spring.datasource.username") { "tests" }
            registry.add("spring.datasource.password") { "tests" }
            registry.add("spring.data.redis.host") {
                System.getenv("RESTRICTIONS_REDIS_TEST_HOST")
                    ?: "restriction-redis"
            }
            registry.add("spring.data.redis.port") { System.getenv("RESTRICTIONS_REDIS_TEST_PORT") ?: "6379" }
            registry.add("spring.data.redis.password") {
                System.getenv("RESTRICTIONS_REDIS_TEST_PASSWORD") ?: "tests-cache-password"
            }
        }
    }
}
