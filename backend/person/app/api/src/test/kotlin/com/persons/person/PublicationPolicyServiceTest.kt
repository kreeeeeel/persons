package com.persons.person

import com.persons.dynamicproperties.component.DynPropertyRegistry
import com.persons.dynamicproperties.component.DynPropertyRuntime
import com.persons.dynamicproperties.component.DynPropertyService
import com.persons.dynamicproperties.storage.MemoryDynPropertyBackend
import com.persons.person.dao.entity.MediaEntity
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.entity.UserModerationSettingsEntity
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.UserModerationSettingsRepository
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.MediaKind
import com.persons.person.service.PublicationPolicyService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import org.springframework.context.ApplicationEventPublisher
import java.time.Clock
import java.util.Optional
import java.util.UUID

class PublicationPolicyServiceTest {
    private val registry = DynPropertyRegistry()
    private val backend = MemoryDynPropertyBackend()
    private val events = ApplicationEventPublisher { }
    private val propertyService = DynPropertyService(registry, backend, events)
    private val users = mock(UserModerationSettingsRepository::class.java)
    private val media = mock(MediaRepository::class.java)
    private val author = UUID.randomUUID()
    private val target = UUID.randomUUID()
    private val service = PublicationPolicyService(propertyService, users, media, Clock.systemUTC())

    @BeforeEach
    fun configure() {
        registry.postProcessAfterInitialization(service, "policy")
        DynPropertyRuntime(registry, backend, events, "policy-test").afterSingletonsInstantiated()
        `when`(users.findById(author)).thenReturn(Optional.empty())
    }

    @Test
    fun `comments reviews and loans use independent settings`() {
        propertyService.update("publication.commentsRequireModeration", "false", null, "test")
        assertThat(service.requiresReview(request(ChangeKind.CREATE_COMMENT))).isFalse()
        assertThat(service.requiresReview(request(ChangeKind.UPDATE_RATING_COMMENT))).isTrue()
        assertThat(service.requiresReview(request(ChangeKind.UPDATE_CREDIT))).isTrue()
        propertyService.update("publication.reviewsRequireModeration", "false", null, "test")
        assertThat(service.requiresReview(request(ChangeKind.UPDATE_RATING_COMMENT))).isFalse()
        propertyService.update("publication.loansRequireModeration", "false", null, "test")
        assertThat(service.requiresReview(request(ChangeKind.UPDATE_CREDIT))).isFalse()
    }

    @Test
    fun `page creation profile changes and avatars have separate gates while ownership stays reviewed`() {
        propertyService.update("publication.pagesRequireModeration", "false", null, "test")
        assertThat(service.requiresReview(request(ChangeKind.CREATE_PERSON))).isFalse()
        assertThat(service.requiresReview(request(ChangeKind.UPDATE_PERSON))).isTrue()
        propertyService.update("publication.profileChangesRequireModeration", "false", null, "test")
        assertThat(service.requiresReview(request(ChangeKind.UPDATE_PERSON))).isFalse()
        `when`(media.findById(target)).thenReturn(Optional.of(MediaEntity(id = target, kind = MediaKind.AVATAR)))
        assertThat(service.requiresReview(request(ChangeKind.PUBLISH_MEDIA))).isTrue()
        propertyService.update("publication.avatarsRequireModeration", "false", null, "test")
        assertThat(service.requiresReview(request(ChangeKind.PUBLISH_MEDIA))).isFalse()
        assertThat(service.requiresReview(request(ChangeKind.CLAIM_OWNERSHIP))).isTrue()
        assertThat(service.requiresReview(request(ChangeKind.DELETE_PERSON))).isTrue()
    }

    @Test
    fun `forced user review overrides disabled profile checks`() {
        propertyService.update("publication.profileChangesRequireModeration", "false", null, "test")
        `when`(users.findById(author)).thenReturn(
            Optional.of(UserModerationSettingsEntity(userId = author, forceModeration = true)),
        )
        assertThat(service.requiresReview(request(ChangeKind.UPDATE_PERSON))).isTrue()
    }

    private fun request(kind: ChangeKind) = ModerationEntity(kind = kind, authorId = author, targetId = target)
}
