package com.persons.restrictions

import com.persons.restrictions.component.AccountAccessManagement
import com.persons.restrictions.component.AccountAdministration
import com.persons.restrictions.component.AdministratorResolver
import com.persons.restrictions.component.RestrictionManagement
import com.persons.restrictions.dao.entity.AccountRestrictionEntity
import com.persons.restrictions.domain.AccountAccessChange
import com.persons.restrictions.domain.AccountRole
import com.persons.restrictions.domain.AccountStatus
import com.persons.restrictions.domain.Administrator
import com.persons.restrictions.domain.ManagedAccount
import com.persons.restrictions.domain.RestrictionChange
import com.persons.restrictions.domain.RestrictionScope
import com.persons.restrictions.exception.impl.ForbiddenException
import com.persons.restrictions.exception.impl.UnavailableException
import com.persons.restrictions.service.RestrictionStore
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import java.time.Instant
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

private val PRIMARY_ADMIN = Administrator(UUID.fromString("e01b7503-83e3-40c4-803c-385b6cd4a4ff"))
private val SECONDARY_ADMIN = Administrator(UUID.fromString("af134084-bd03-4ae1-9416-3823312d5445"))

@SpringBootTest
@ActiveProfiles("tests")
class AccountAccessIntegrationTest {
    @Autowired private lateinit var access: AccountAccessManagement

    @Autowired private lateinit var management: RestrictionManagement

    @Autowired private lateinit var store: RestrictionStore

    @Autowired private lateinit var fixtures: JpaTestData

    @MockitoBean private lateinit var redis: StringRedisTemplate

    @MockitoBean private lateinit var administrators: AdministratorResolver

    @MockitoBean private lateinit var accounts: AccountAdministration
    private val actor = ThreadLocal.withInitial { PRIMARY_ADMIN }
    private val secondaryDemoted = AtomicBoolean(false)

    @BeforeEach
    fun prepare() {
        // The parent entity removes its element collection.
        fixtures.delete(AccountRestrictionEntity::class.java) { true }
        actor.set(PRIMARY_ADMIN)
        secondaryDemoted.set(false)
        Mockito.`when`(administrators.required()).thenAnswer {
            val current = actor.get()
            if (current == SECONDARY_ADMIN && secondaryDemoted.get()) throw ForbiddenException()
            current
        }
        listOf(PRIMARY_ADMIN, SECONDARY_ADMIN).stream().forEach { administrator ->
            AccountRole.entries.stream().forEach { role ->
                Mockito.`when`(accounts.updateRole(administrator.id, role)).thenReturn(account(administrator.id, role))
            }
        }
    }

    @Test
    fun `administrator cannot block or demote their own account`() {
        assertThatThrownBy { access.update(PRIMARY_ADMIN.id, change(AccountRole.ADMIN, AccountStatus.BLOCKED)) }
            .isInstanceOf(ForbiddenException::class.java)
        assertThatThrownBy { access.update(PRIMARY_ADMIN.id, change(AccountRole.USER, AccountStatus.ACTIVE)) }
            .isInstanceOf(ForbiddenException::class.java)
        Mockito.verifyNoInteractions(accounts)
    }

    @Test
    fun `blocked administrator cannot grant roles or remove their own restriction`() {
        actor.set(SECONDARY_ADMIN)
        management.set(PRIMARY_ADMIN.id, RestrictionChange(setOf(RestrictionScope.ACCOUNT), "Blocked", null))
        actor.set(PRIMARY_ADMIN)
        assertThatThrownBy { access.update(SECONDARY_ADMIN.id, change(AccountRole.ADMIN, AccountStatus.ACTIVE)) }
            .isInstanceOf(ForbiddenException::class.java)
        assertThatThrownBy { management.revoke(PRIMARY_ADMIN.id) }.isInstanceOf(ForbiddenException::class.java)
        Mockito.verifyNoInteractions(accounts)
    }

    @Test
    fun `failed role update keeps the restrictive change committed`() {
        Mockito.`when`(accounts.updateRole(SECONDARY_ADMIN.id, AccountRole.USER)).thenThrow(UnavailableException())
        assertThatThrownBy { access.update(SECONDARY_ADMIN.id, change(AccountRole.USER, AccountStatus.BLOCKED)) }
            .isInstanceOf(UnavailableException::class.java)
        assertThat(store.find(listOf(SECONDARY_ADMIN.id)).single().scopes).contains(RestrictionScope.ACCOUNT)
    }

    @Test
    fun `failed role update never unblocks an existing restriction`() {
        management.set(SECONDARY_ADMIN.id, RestrictionChange(setOf(RestrictionScope.ACCOUNT), "Blocked", null))
        Mockito.`when`(accounts.updateRole(SECONDARY_ADMIN.id, AccountRole.USER)).thenThrow(UnavailableException())
        assertThatThrownBy { access.update(SECONDARY_ADMIN.id, change(AccountRole.USER, AccountStatus.ACTIVE)) }
            .isInstanceOf(UnavailableException::class.java)
        assertThat(store.find(listOf(SECONDARY_ADMIN.id)).single().revoked).isFalse()
    }

    @Test
    fun `concurrent demotion rechecks administrator role under the shared database lock`() {
        val roleUpdateStarted = CountDownLatch(1)
        val finishRoleUpdate = CountDownLatch(1)
        val banStarted = CountDownLatch(1)
        Mockito.`when`(accounts.updateRole(SECONDARY_ADMIN.id, AccountRole.USER)).thenAnswer {
            roleUpdateStarted.countDown()
            if (!finishRoleUpdate.await(10, TimeUnit.SECONDS)) throw UnavailableException()
            secondaryDemoted.set(true)
            account(SECONDARY_ADMIN.id, AccountRole.USER)
        }
        Executors.newFixedThreadPool(2).use { executor ->
            val demotion = executor.submit<ManagedAccount> {
                actor.set(PRIMARY_ADMIN)
                access.update(SECONDARY_ADMIN.id, change(AccountRole.USER, AccountStatus.ACTIVE))
            }
            assertThat(roleUpdateStarted.await(10, TimeUnit.SECONDS)).isTrue()
            val ban = executor.submit<Boolean> {
                actor.set(SECONDARY_ADMIN)
                banStarted.countDown()
                try {
                    management.set(
                        PRIMARY_ADMIN.id, RestrictionChange(setOf(RestrictionScope.ACCOUNT), "Blocked", null),
                    )
                    false
                } catch (forbidden: ForbiddenException) {
                    true
                }
            }
            assertThat(banStarted.await(10, TimeUnit.SECONDS)).isTrue()
            finishRoleUpdate.countDown()
            assertThat(demotion.get(15, TimeUnit.SECONDS).role).isEqualTo(AccountRole.USER)
            assertThat(ban.get(15, TimeUnit.SECONDS)).isTrue()
        }
        assertThat(store.find(listOf(PRIMARY_ADMIN.id))).isEmpty()
    }

    private fun change(role: AccountRole, status: AccountStatus) = AccountAccessChange(role, status)

    private fun account(id: UUID, role: AccountRole) = ManagedAccount(
        id, "test@example.test", "Test", "User", role, AccountStatus.ACTIVE, Instant.parse("2026-10-20T00:00:00Z"),
    )
}
