package com.persons.restrictions

import com.persons.requestobservability.SignedJwt
import com.persons.restrictions.component.AdministratorResolver
import com.persons.restrictions.component.RestrictionComponent
import com.persons.restrictions.dao.entity.AccountRestrictionEntity
import com.persons.restrictions.domain.Administrator
import com.persons.restrictions.domain.RestrictionChange
import com.persons.restrictions.domain.RestrictionScope
import com.persons.restrictions.exception.impl.ForbiddenException
import com.persons.restrictions.service.RestrictionStore
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.dao.DataAccessResourceFailureException
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.ValueOperations
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import java.time.Instant
import java.util.UUID

private const val INTERNAL_SECRET = "tests-internal-jwt-secret-with-at-least-thirty-two-characters"
private val ADMINISTRATOR = Administrator(UUID.fromString("76b2aafe-ed60-49ab-a2dc-28d02ed10a01"))

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("tests")
class RestrictionIntegrationTest {
    @Autowired private lateinit var restrictions: RestrictionComponent

    @Autowired private lateinit var store: RestrictionStore

    @Autowired private lateinit var fixtures: JpaTestData

    @Autowired private lateinit var mvc: MockMvc

    @MockitoBean private lateinit var redis: StringRedisTemplate

    @MockitoBean private lateinit var administrators: AdministratorResolver

    private val values = mutableMapOf<String, String>()
    private lateinit var operations: ValueOperations<String, String>

    @BeforeEach
    fun reset() {
        // The parent entity removes its element collection.
        fixtures.delete(AccountRestrictionEntity::class.java) { true }
        values.clear()
        @Suppress("UNCHECKED_CAST")
        val mocked = Mockito.mock(ValueOperations::class.java) as ValueOperations<String, String>
        operations = mocked
        Mockito.`when`(redis.opsForValue()).thenReturn(operations)
        Mockito.`when`(operations.get(anyString())).thenAnswer { values[it.getArgument(0)] }
        Mockito.doAnswer {
            values[it.getArgument(0)] = it.getArgument(1)
            null
        }.`when`(operations).set(anyString(), anyString(), Mockito.any(java.time.Duration::class.java))
        Mockito.`when`(administrators.required()).thenReturn(ADMINISTRATOR)
    }

    @Test
    fun `active restriction page excludes revoked and expired records and searches literal reasons`() {
        val first = UUID.randomUUID()
        restrictions.set(
            first, RestrictionChange(setOf(RestrictionScope.COMMENTS), "Спам 100%", null), ADMINISTRATOR,
        )
        restrictions.set(
            UUID.randomUUID(), RestrictionChange(setOf(RestrictionScope.MEDIA), "Спам 1000", null), ADMINISTRATOR,
        )
        val expired = UUID.randomUUID()
        restrictions.set(expired, change(RestrictionScope.COMMENTS), ADMINISTRATOR)
        fixtures.update(AccountRestrictionEntity::class.java, { it.userId == expired }) { row ->
            row.expiresAt = Instant.EPOCH
        }
        val revoked = UUID.randomUUID()
        restrictions.set(revoked, change(RestrictionScope.COMMENTS), ADMINISTRATOR)
        restrictions.revoke(revoked, ADMINISTRATOR)
        val filtered = store.page(0, 1, "100%", null)
        assertThat(filtered.totalElements).isEqualTo(1)
        assertThat(filtered.content.single().userId).isEqualTo(first)
        assertThat(store.page(0, 1, "", null).totalElements).isEqualTo(2)
        assertThat(store.page(0, 20, "", first).content).hasSize(1)
    }

    @Test
    fun `committed edits and revocations immediately replace cached restrictions`() {
        val userId = UUID.randomUUID()
        val first = restrictions.set(userId, change(RestrictionScope.COMMENTS), ADMINISTRATOR)
        assertThat(restrictions.current(userId)?.scopes).containsExactly(RestrictionScope.COMMENTS)
        val revised = restrictions.set(userId, change(RestrictionScope.MEDIA), ADMINISTRATOR)
        assertThat(revised.revision).isGreaterThan(first.revision)
        assertThat(restrictions.current(userId)?.scopes).containsExactly(RestrictionScope.MEDIA)
        restrictions.revoke(userId, ADMINISTRATOR)
        assertThat(restrictions.current(userId)).isNull()
        assertThat(store.revision(userId)).isGreaterThan(revised.revision)
        assertThat(values).hasSize(3)
    }

    @Test
    fun `redis failure falls back to canonical database policy`() {
        val userId = UUID.randomUUID()
        restrictions.set(userId, change(RestrictionScope.ACCOUNT), ADMINISTRATOR)
        Mockito.`when`(operations.get(anyString())).thenThrow(DataAccessResourceFailureException("cache unavailable"))
        assertThat(restrictions.current(userId)?.scopes).containsExactly(RestrictionScope.ACCOUNT)
    }

    @Test
    fun `corrupt cache falls back to database and missing policy stays empty`() {
        val userId = UUID.randomUUID()
        restrictions.set(userId, change(RestrictionScope.COMMENTS), ADMINISTRATOR)
        listOf("invalid-json", "null").stream().forEach { value ->
            Mockito.`when`(operations.get(anyString())).thenReturn(value)
            assertThat(restrictions.current(userId)?.scopes).containsExactly(RestrictionScope.COMMENTS)
        }
        assertThat(restrictions.current(UUID.randomUUID())).isNull()
    }

    @Test
    fun `expired restriction stops applying before cleanup job runs`() {
        val userId = UUID.randomUUID()
        restrictions.set(userId, change(RestrictionScope.MEDIA), ADMINISTRATOR)
        fixtures.update(AccountRestrictionEntity::class.java, { it.userId == userId }) { row ->
            row.expiresAt = Instant.now().minusSeconds(1)
        }
        assertThat(restrictions.current(userId)).isNull()
        val revision = store.revision(userId)
        assertThat(restrictions.expire()).isEqualTo(1)
        assertThat(store.revision(userId)).isGreaterThan(revision)
        assertThat(restrictions.expire()).isZero()
    }

    @Test
    fun `administrator cannot self ban and blocked administrator cannot change policies`() {
        assertThatThrownBy { restrictions.set(ADMINISTRATOR.id, change(RestrictionScope.ACCOUNT), ADMINISTRATOR) }
            .isInstanceOf(ForbiddenException::class.java)
        val other = Administrator(UUID.randomUUID())
        restrictions.set(ADMINISTRATOR.id, change(RestrictionScope.ACCOUNT), other)
        assertThatThrownBy { restrictions.set(UUID.randomUUID(), change(RestrictionScope.COMMENTS), ADMINISTRATOR) }
            .isInstanceOf(ForbiddenException::class.java)
        assertThatThrownBy { restrictions.revoke(ADMINISTRATOR.id, ADMINISTRATOR) }
            .isInstanceOf(ForbiddenException::class.java)
    }

    @Test
    fun `restriction catalog requires service credentials and an administrator`() {
        restrictions.set(UUID.randomUUID(), change(RestrictionScope.COMMENTS), ADMINISTRATOR)
        mvc.get("/v1/restrictions").andExpect { status { isUnauthorized() } }
        val header = "Bearer ${SignedJwt(INTERNAL_SECRET).service("tests")}"
        mvc.get("/v1/restrictions") { header("X-Service-Authorization", header) }
            .andExpect {
                status { isOk() }
                jsonPath("$.total") { value(1) }
            }
        Mockito.`when`(administrators.required()).thenThrow(ForbiddenException())
        mvc.get("/v1/restrictions") { header("X-Service-Authorization", header) }
            .andExpect { status { isForbidden() } }
    }

    @Test
    fun `internal routes reject missing or forged service authorization`() {
        val path = "/v1/users/${UUID.randomUUID()}/restriction"
        mvc.get(path).andExpect { status { isUnauthorized() } }
        mvc.get(path) { header("X-Service-Authorization", "Bearer forged") }
            .andExpect { status { isUnauthorized() } }
        mvc.get(path) { header("X-Service-Authorization", "Bearer ${SignedJwt(INTERNAL_SECRET).service("tests")}") }
            .andExpect {
                status { isOk() }
                jsonPath("$.restriction") { doesNotExist() }
            }
    }

    @Test
    fun `batch lookup only returns effective restrictions`() {
        val first = UUID.randomUUID()
        val second = UUID.randomUUID()
        restrictions.set(first, change(RestrictionScope.COMMENTS), ADMINISTRATOR)
        restrictions.set(second, change(RestrictionScope.LOANS), ADMINISTRATOR)
        restrictions.revoke(second, ADMINISTRATOR)
        assertThat(
            restrictions.lookup(listOf(first, second, UUID.randomUUID())).map {
                it.userId
            },
        ).containsExactly(first)
    }

    private fun change(scope: RestrictionScope): RestrictionChange =
        RestrictionChange(setOf(scope), "Test restriction", null)
}
