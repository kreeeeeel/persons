package com.persons.id

import com.persons.id.component.AvatarStorage
import com.persons.id.dao.entity.AccountEntity
import com.persons.id.dao.repository.AccountRepository
import com.persons.id.exception.impl.StorageUnavailableException
import com.persons.id.service.AccountService
import com.persons.id.service.AvatarTransferService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import java.time.Clock
import java.time.Instant

private const val BYTES_1: Byte = 1
private const val BYTES_2: Byte = 2
private const val BYTES_3: Byte = 3

private const val RETRY_DELAY_SECONDS = 60L
private val NOW = Instant.parse("2026-10-08T12:00:00Z")

@SpringBootTest(
    properties = [
        "project.id.avatar-sync-delay-ms=3600000",
        "spring.datasource.url=jdbc:h2:mem:avatar-transfer;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    ],
)
@ActiveProfiles("tests")
class AvatarTransferIntegrationTest {
    @Autowired
    private lateinit var repository: AccountRepository

    @Autowired
    private lateinit var transfers: AvatarTransferService

    @Autowired
    private lateinit var accounts: AccountService

    @MockitoBean
    private lateinit var storage: AvatarStorage

    @MockitoBean
    private lateinit var clock: Clock

    @BeforeEach
    fun reset() {
        repository.deleteAll()
        `when`(clock.instant()).thenReturn(NOW)
    }

    @Test
    fun `transfers legacy and pending avatars and retains only a reference after success`() {
        val bytes = byteArrayOf(BYTES_1.toByte(), BYTES_2.toByte(), BYTES_3)
        val account = repository.save(AccountEntity(email = "transfer@example.test", avatar = bytes))
        val key = "Persons/User-image/${account.id}/avatar.jpg"

        `when`(storage.put(account.id, bytes)).thenReturn(key)
        `when`(storage.get(key)).thenReturn(bytes)
        transfers.dispatch()

        val updated = repository.findById(account.id).orElseThrow()

        assertThat(updated.avatar).isNull()
        assertThat(updated.avatarObjectKey).isEqualTo(key)
        assertThat(accounts.get(account.id).hasAvatar).isTrue()
        assertThat(accounts.avatar(account.id)).isEqualTo(bytes)
        verify(storage).get(key)
    }

    @Test
    fun `preserves pending bytes on storage failure and applies retry backoff`() {
        val bytes = byteArrayOf(BYTES_1.toByte(), BYTES_2.toByte(), BYTES_3)
        val account = repository.save(AccountEntity(email = "retry@example.test", avatar = bytes))

        `when`(storage.put(account.id, bytes)).thenThrow(StorageUnavailableException())
        transfers.dispatch()
        transfers.dispatch()

        val updated = repository.findById(account.id).orElseThrow()

        assertThat(updated.avatar).isEqualTo(bytes)
        assertThat(updated.avatarObjectKey).isNull()
        assertThat(updated.avatarNextAttemptAt).isEqualTo(NOW.plusSeconds(RETRY_DELAY_SECONDS))
        assertThat(accounts.avatar(account.id)).isEqualTo(bytes)
        verify(storage).put(account.id, bytes)
    }
}
