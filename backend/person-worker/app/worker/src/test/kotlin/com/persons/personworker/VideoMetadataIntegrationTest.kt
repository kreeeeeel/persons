package com.persons.personworker

import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.StorageGarbageEntity
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import com.persons.person.maintenance.dao.entity.MediaQualityEntity
import com.persons.person.maintenance.dao.entity.MediaTranscodeJobEntity
import com.persons.personworker.dao.VideoWorkRepository
import com.persons.personworker.domain.VideoWork
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
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

@SpringBootTest
@ActiveProfiles("tests")
@Transactional
class VideoMetadataIntegrationTest {
    @Autowired private lateinit var fixtures: JpaTestData

    @Autowired private lateinit var jobs: VideoWorkRepository

    @MockitoBean private lateinit var s3: S3Client

    @MockitoBean private lateinit var clock: Clock
    private val now = Instant.parse("2026-10-21T12:00:00Z")

    @BeforeEach
    fun configureClock() {
        `when`(clock.instant()).thenReturn(now)
    }

    @Test
    fun `stores small renditions and authoritative metadata only for the active lease and retires old previews`() {
        val person = UUID.randomUUID()
        val work = VideoWork(UUID.randomUUID(), "test/clip.mov", UUID.randomUUID())
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
                id = work.id,
                personId = person,
                uploaderId = person,
                uploaderName = "Test",
                kind = MediaKind.MOMENT,
                status = MediaStatus.PUBLISHED,
                objectKey = work.key,
                contentType = "video/quicktime",
                sizeBytes = 100,
                caption = "",
                createdAt = now,
                previewObjectKey = "old-preview",
                previewContentType = "image/jpeg",
                previewSize = 10,
            ),
        )
        fixtures.save(
            MediaTranscodeJobEntity(
                mediaId = work.id,
                status = "RUNNING",
                attempts = 1,
                leaseToken = work.token,
                updatedAt = now,
            ),
        )
        jobs.prepare("new-preview")
        jobs.metadata(work, 4.5, "new-preview", 25)
        jobs.save(work, 240, 320, "compatible.mp4", 80)
        assertThat(
            fixtures.all(MediaEntity::class.java).stream()
                .filter {
                    it.id == work.id
                }.toList().singleOrNull()?.durationSeconds,
        ).isEqualTo(4.5)
        assertThat(
            fixtures.all(MediaEntity::class.java).stream()
                .filter {
                    it.id == work.id
                }.toList().singleOrNull()?.previewObjectKey,
        ).isEqualTo("new-preview")
        assertThat(
            fixtures.all(StorageGarbageEntity::class.java).stream()
                .filter {
                    it.objectKey == "old-preview"
                }.count(),
        ).isEqualTo(1)
        assertThat(
            fixtures.all(StorageGarbageEntity::class.java).stream()
                .filter {
                    it.objectKey == "new-preview"
                }.count(),
        ).isZero()
        assertThat(
            fixtures.all(MediaQualityEntity::class.java).stream()
                .filter {
                    it.mediaId == work.id
                }.toList().singleOrNull()?.height,
        ).isEqualTo(240)
        jobs.prepare("stale-preview")
        jobs.metadata(work.copy(token = UUID.randomUUID()), 9.0, "stale-preview", 50)
        assertThat(
            fixtures.all(MediaEntity::class.java).stream()
                .filter {
                    it.id == work.id
                }.toList().singleOrNull()?.previewObjectKey,
        ).isEqualTo("new-preview")
        assertThat(
            fixtures.all(StorageGarbageEntity::class.java).stream()
                .filter {
                    it.objectKey == "stale-preview"
                }.count(),
        ).isEqualTo(1)
    }
}
