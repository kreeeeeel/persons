package com.persons.personworker

import com.persons.person.dao.entity.CreditEntryEntity
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.RatingEntity
import com.persons.person.dao.entity.RatingOptionEntity
import com.persons.person.dao.entity.StorageGarbageEntity
import com.persons.person.domain.CreditKind
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import com.persons.person.maintenance.AggregateReputation
import com.persons.person.maintenance.PersonAggregateStore
import com.persons.personworker.component.AggregateProcessor
import com.persons.personworker.component.MediaGarbageProcessor
import com.persons.personworker.dao.AggregateRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.transaction.support.TransactionTemplate
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest
import software.amazon.awssdk.services.s3.model.DeleteObjectResponse
import java.time.Clock
import java.time.Instant
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit

@SpringBootTest(
    properties = [
        "spring.jpa.database-platform=\${WORKER_TEST_DIALECT:com.persons.personworker.WorkerH2Dialect}",
    ],
)
@ActiveProfiles("tests")
class WorkerIntegrationTest {
    @Autowired private lateinit var fixtures: JpaTestData

    @Autowired private lateinit var aggregates: PersonAggregateStore

    @Autowired private lateinit var processor: AggregateProcessor

    @Autowired private lateinit var rows: AggregateRepository

    @Autowired private lateinit var media: MediaGarbageProcessor

    @Autowired private lateinit var transactions: TransactionTemplate

    @MockitoBean private lateinit var s3: S3Client

    @MockitoBean private lateinit var clock: Clock
    private val now = Instant.parse("2026-10-18T00:00:00Z")

    @BeforeEach
    fun configureClock() {
        Mockito.`when`(clock.instant()).thenReturn(now)
        Mockito.`when`(s3.deleteObject(any(DeleteObjectRequest::class.java)))
            .thenReturn(DeleteObjectResponse.builder().build())
    }

    @Test
    fun `recalculates snapshots after inserts edits and removals without counting pending or deleted loans`() {
        val person = person()
        val option = UUID.randomUUID()
        fixtures.save(
            RatingOptionEntity(
                id = option,
                personId = person,
                emoji = "⭐",
                label = "test",
                position = 0,
                enabled = true,
            ),
        )
        val first = rating(person, option, 1)
        val second = rating(person, option, 5)
        loan(person, "ON_TIME", true)
        loan(person, "NOT_RETURNED", false)
        val deleted = loan(person, "NOT_RETURNED", true)
        fixtures.update(CreditEntryEntity::class.java, { it.id == deleted }) { row ->
            row.deleted = true
        }
        transactions.executeWithoutResult { aggregates.request(person) }
        assertThat(aggregates.pending(person)).isTrue()
        assertThat(rows.candidates(100)).contains(person)
        processor.recalculate(person)
        val calculated = aggregates.get(person)
        assertThat(calculated.ratingCount).isEqualTo(2)
        assertThat(calculated.ratingAverage).isEqualTo(3.0)
        assertThat(calculated.loanCount).isEqualTo(1)
        assertThat(calculated.reputation).isEqualTo(AggregateReputation.GOOD)
        assertThat(calculated.calculatedAt).isEqualTo(now)
        assertThat(aggregates.optionCounts(person)[option]).isEqualTo(2)
        assertThat(aggregates.pending(person)).isFalse()
        processor.recalculate(person)
        assertThat(aggregates.get(person)).isEqualTo(calculated)
        fixtures.update(RatingEntity::class.java, { it.id == second }) { row ->
            row.value = 1
        }
        transactions.executeWithoutResult { aggregates.request(person) }
        processor.recalculate(person)
        assertThat(aggregates.get(person).reputation).isEqualTo(AggregateReputation.AVERAGE)
        fixtures.delete(RatingEntity::class.java) { it.id in listOf(first, second) }
        fixtures.update(CreditEntryEntity::class.java, { it.personId == person }) { row ->
            row.deleted = true
        }
        transactions.executeWithoutResult { aggregates.request(person) }
        processor.recalculate(person)
        assertThat(aggregates.get(person).reputation).isEqualTo(AggregateReputation.UNKNOWN)
        assertThat(aggregates.get(person).ratingCount).isZero()
        assertThat(aggregates.optionCounts(person)).isEmpty()
    }

    @Test
    fun `skips a person being updated and leaves their queued calculation intact`() {
        val person = person()
        transactions.executeWithoutResult { aggregates.request(person) }
        transactions.executeWithoutResult {
            fixtures.lock(PersonEntity::class.java, person)
            CompletableFuture.runAsync { processor.recalculate(person) }.get(5, TimeUnit.SECONDS)
            assertThat(aggregates.pending(person)).isTrue()
        }
        processor.recalculate(person)
        assertThat(aggregates.pending(person)).isFalse()
        assertThat(aggregates.get(person).reputation).isEqualTo(AggregateReputation.UNKNOWN)
    }

    @Test
    fun `retired images remain for five years while recent unattached uploads remain protected`() {
        val retired = UUID.randomUUID()
        val staged = UUID.randomUUID()
        fixtures.save(
            StorageGarbageEntity(
                id = retired,
                objectKey = "achievments/$retired",
                createdAt = now,
                retiredAt = now,
            ),
        )
        fixtures.save(
            StorageGarbageEntity(
                id = staged,
                objectKey = "achievments/$staged",
                createdAt = now,
            ),
        )

        media.purge(retired, now.minusSeconds(86400), true)
        media.purge(staged, now.minusSeconds(86400), true)

        Mockito.verify(s3, Mockito.never()).deleteObject(
            org.mockito.ArgumentMatchers.argThat<DeleteObjectRequest> { it.key() == "achievments/$retired" },
        )
        assertThat(
            fixtures.all(StorageGarbageEntity::class.java).stream()
                .filter {
                    it.id == retired
                }.count(),
        )
            .isEqualTo(1)
        assertThat(
            fixtures.all(StorageGarbageEntity::class.java).stream()
                .filter {
                    it.id == staged
                }.count(),
        )
            .isEqualTo(1)

        fixtures.update(StorageGarbageEntity::class.java, { it.id == retired }) { row ->
            row.retiredAt = now.atOffset(java.time.ZoneOffset.UTC).minusYears(5).toInstant()
        }
        media.purge(retired, now.minusSeconds(86400), true)
        assertThat(
            fixtures.all(StorageGarbageEntity::class.java).stream()
                .filter {
                    it.id == retired
                }.count(),
        )
            .isZero()
    }

    @Test
    fun `failed S3 deletion is retried and recent staged uploads remain protected`() {
        val id = UUID.randomUUID()
        fixtures.save(
            StorageGarbageEntity(
                id = id,
                objectKey = "old/" + id,
                createdAt = now.minusSeconds(172800),
            ),
        )
        Mockito.`when`(s3.deleteObject(any(DeleteObjectRequest::class.java)))
            .thenThrow(IllegalStateException("S3 unavailable"))
        assertThatThrownBy {
            media.purge(id, now.minusSeconds(86400), true)
        }.isInstanceOf(IllegalStateException::class.java)
        assertThat(
            fixtures.all(StorageGarbageEntity::class.java).stream()
                .filter {
                    it.id == id
                }.count(),
        )
            .isEqualTo(1)
        Mockito.`when`(s3.deleteObject(any(DeleteObjectRequest::class.java)))
            .thenReturn(DeleteObjectResponse.builder().build())
        media.purge(id, now.minusSeconds(86400), true)
        assertThat(
            fixtures.all(StorageGarbageEntity::class.java).stream()
                .filter {
                    it.id == id
                }.count(),
        )
            .isZero()
        val staged = UUID.randomUUID()
        fixtures.save(
            MediaEntity(
                id = staged,
                personId = person(),
                uploaderId = UUID.randomUUID(),
                uploaderName = "test",
                kind = MediaKind.PHOTO,
                status = MediaStatus.STAGED,
                objectKey = "new/" + staged,
                contentType = "image/webp",
                sizeBytes = 1,
                caption = "",
                createdAt = now,
            ),
        )
        media.purge(staged, now.minusSeconds(86400), false)
        assertThat(
            fixtures.all(MediaEntity::class.java).stream()
                .filter {
                    it.id == staged
                }.toList().singleOrNull()?.status?.name,
        )
            .isEqualTo("STAGED")
    }

    @Test
    fun `media retention starts at deletion and never expires active media based on upload time`() {
        val boundary = now.atOffset(java.time.ZoneOffset.UTC).minusYears(5).toInstant()
        val person = person()
        val expired = retainedMedia(person, "DELETED", boundary)
        val recent = retainedMedia(person, "DELETED", boundary.plusSeconds(1))
        val active = retainedMedia(person, "PUBLISHED", null)

        media.purge(expired, now.minusSeconds(86400), false)
        media.purge(recent, now.minusSeconds(86400), false)
        media.purge(active, now.minusSeconds(86400), false)

        assertThat(
            fixtures.all(MediaEntity::class.java).stream()
                .filter {
                    it.id == expired
                }.toList().singleOrNull()?.status?.name,
        )
            .isEqualTo("PURGED")
        assertThat(
            fixtures.all(MediaEntity::class.java).stream()
                .filter {
                    it.id == recent
                }.toList().singleOrNull()?.status?.name,
        )
            .isEqualTo("DELETED")
        assertThat(
            fixtures.all(MediaEntity::class.java).stream()
                .filter {
                    it.id == active
                }.toList().singleOrNull()?.status?.name,
        )
            .isEqualTo("PUBLISHED")
    }

    @Test
    fun `deleting a page retains its media until the page deletion anniversary`() {
        val person = person()
        val id = retainedMedia(person, "PUBLISHED", null)
        fixtures.update(PersonEntity::class.java, { it.id == person }) { row ->
            row.deleted = true
            row.deletedAt = now
        }
        media.purge(id, now.minusSeconds(86400), false)
        assertThat(
            fixtures.all(MediaEntity::class.java).stream()
                .filter {
                    it.id == id
                }.toList().singleOrNull()?.status?.name,
        )
            .isEqualTo("PUBLISHED")

        fixtures.update(PersonEntity::class.java, { it.id == person }) { row ->
            row.deletedAt = now.atOffset(java.time.ZoneOffset.UTC).minusYears(5).toInstant()
        }
        media.purge(id, now.minusSeconds(86400), false)
        assertThat(
            fixtures.all(MediaEntity::class.java).stream()
                .filter {
                    it.id == id
                }.toList().singleOrNull()?.status?.name,
        )
            .isEqualTo("PURGED")
    }

    private fun retainedMedia(person: UUID, status: String, deletedAt: Instant?): UUID {
        val id = UUID.randomUUID()
        fixtures.save(
            MediaEntity(
                id = id,
                personId = person,
                uploaderId = UUID.randomUUID(),
                uploaderName = "test",
                kind = MediaKind.PHOTO,
                status = MediaStatus.valueOf(status),
                objectKey = "retained/$id",
                contentType = "image/webp",
                sizeBytes = 1,
                caption = "",
                createdAt = now.atOffset(java.time.ZoneOffset.UTC).minusYears(10).toInstant(),
                deletedAt = deletedAt,
            ),
        )
        return id
    }

    private fun person(): UUID {
        val id = UUID.randomUUID()
        fixtures.save(
            PersonEntity(
                id = id,
                tag = id.toString().take(32),
                firstName = "Test",
                lastName = "Person",
                description = "",
                published = true,
                createdAt = now,
            ),
        )
        return id
    }
    private fun rating(person: UUID, option: UUID, value: Int): UUID {
        val id = UUID.randomUUID()
        fixtures.save(
            RatingEntity(
                id = id,
                personId = person,
                userId = UUID.randomUUID(),
                optionId = option,
                value = value,
                createdAt = now,
            ),
        )
        return id
    }
    private fun loan(person: UUID, kind: String, published: Boolean): UUID {
        val id = UUID.randomUUID()
        fixtures.save(
            CreditEntryEntity(
                id = id,
                personId = person,
                kind = CreditKind.valueOf(kind),
                description = "test",
                authorId = UUID.randomUUID(),
                authorName = "test",
                published = published,
                createdAt = now,
            ),
        )
        return id
    }
}
