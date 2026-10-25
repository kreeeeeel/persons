package com.persons.personworker

import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.StorageGarbageEntity
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import com.persons.person.maintenance.dao.entity.MediaQualityEntity
import com.persons.person.maintenance.dao.entity.MediaTranscodeJobEntity
import com.persons.personworker.dao.VideoWorkRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.transaction.annotation.Transactional
import software.amazon.awssdk.services.s3.S3Client
import java.time.Clock
import java.time.Instant
import java.util.UUID

@SpringBootTest(
    properties = [
        "spring.datasource.url=\${WORKER_POSTGRES_TEST_URL}",
        "spring.datasource.username=tests",
        "spring.datasource.password=tests",
    ],
)
@EnabledIfEnvironmentVariable(named = "WORKER_POSTGRES_TEST_URL", matches = ".+")
@ActiveProfiles("tests")
@Transactional
class VideoWorkIntegrationTest {
    @Autowired private lateinit var fixtures: JpaTestData

    @Autowired private lateinit var jobs: VideoWorkRepository

    @MockitoBean private lateinit var s3: S3Client

    @MockitoBean private lateinit var clock: Clock
    private val now = Instant.parse("2026-10-19T20:00:00Z")

    @BeforeEach
    fun configureClock() {
        `when`(clock.instant()).thenReturn(now)
    }

    @Test
    fun `leases pending videos retries failures and ignores stale results without losing garbage cleanup`() {
        val person = UUID.randomUUID()
        val media = UUID.randomUUID()
        fixtures.save(
            PersonEntity(
                id = person,
                tag = person.toString().take(32),
                firstName = "Test",
                lastName = "",
                description = "",
                published = true,
                createdAt = now,
            ),
        )
        fixtures.save(
            MediaEntity(
                id = media,
                personId = person,
                uploaderId = UUID.randomUUID(),
                uploaderName = "Test",
                kind = MediaKind.MOMENT,
                status = MediaStatus.PENDING,
                objectKey = "test/original.mp4",
                contentType = "video/mp4",
                sizeBytes = 100,
                caption = "",
                createdAt = now,
            ),
        )
        fixtures.save(
            MediaTranscodeJobEntity(
                mediaId = media,
                status = "QUEUED",
                attempts = 0,
                updatedAt = now,
            ),
        )
        val first = jobs.claim(now)
        if (first == null) {
            throw AssertionError("The queued video must be claimed")
        }
        assertThat(first.id).isEqualTo(media)
        assertThat(jobs.claim(now)).isNull()
        jobs.prepare("qualities/first.mp4")
        jobs.save(first, 360, 640, "qualities/first.mp4", 50)
        assertThat(garbage("qualities/first.mp4")).isZero()
        jobs.finish(first, false, now)
        assertThat(jobs.claim(now.plusSeconds(299))).isNull()
        val retry = jobs.claim(now.plusSeconds(301))
        if (retry == null) {
            throw AssertionError("The failed video must be retried after the retry delay")
        }
        assertThat(retry.token).isNotEqualTo(first.token)
        jobs.prepare("qualities/stale.mp4")
        jobs.save(first, 360, 640, "qualities/stale.mp4", 50)
        assertThat(garbage("qualities/stale.mp4")).isEqualTo(1)
        jobs.prepare("qualities/retry.mp4")
        jobs.save(retry, 360, 640, "qualities/retry.mp4", 45)
        assertThat(garbage("qualities/first.mp4")).isEqualTo(1)
        assertThat(garbage("qualities/retry.mp4")).isZero()
        jobs.finish(first, true, now)
        assertThat(jobs.current(retry)).isTrue()
        jobs.finish(retry, true, now)
        assertThat(jobs.claim(now.plusSeconds(7200))).isNull()
        assertThat(
            fixtures.all(MediaQualityEntity::class.java).stream()
                .filter {
                    it.mediaId == media
                }.toList().singleOrNull()?.objectKey,
        ).isEqualTo("qualities/retry.mp4")
        fixtures.update(MediaTranscodeJobEntity::class.java, { it.mediaId == media }) { row ->
            row.status = "RUNNING"
            row.attempts = 3
            row.updatedAt = now
        }
        assertThat(jobs.claim(now.plusSeconds(3601))).isNull()
        assertThat(
            fixtures.all(MediaTranscodeJobEntity::class.java).stream()
                .filter {
                    it.mediaId == media
                }.toList().singleOrNull()?.status,
        ).isEqualTo("FAILED")
    }

    private fun garbage(key: String): Long? = fixtures.all(StorageGarbageEntity::class.java).stream()
        .filter {
            it.objectKey == key
        }.count()
}
