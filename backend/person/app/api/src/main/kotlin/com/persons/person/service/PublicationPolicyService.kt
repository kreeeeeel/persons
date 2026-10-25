package com.persons.person.service

import com.persons.dynamicproperties.DynPropertyFactory
import com.persons.dynamicproperties.component.DynPropertyService
import com.persons.person.contract.dto.PublicationSettings
import com.persons.person.contract.dto.UserModerationSettings
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.entity.UserModerationSettingsEntity
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.UserModerationSettingsRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.MediaKind
import com.persons.person.exception.impl.ForbiddenException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.util.UUID

@Service
class PublicationPolicyService(
    private val propertyService: DynPropertyService,
    private val users: UserModerationSettingsRepository,
    private val media: MediaRepository,
    private val clock: Clock,
) {
    private val comments = DynPropertyFactory.createBoolean("publication.commentsRequireModeration", true)
        .description("Модерация: comments").build()
    private val photos = DynPropertyFactory.createBoolean("publication.photosRequireModeration", true)
        .description("Модерация: photos").build()
    private val moments = DynPropertyFactory.createBoolean("publication.momentsRequireModeration", true)
        .description("Модерация: moments").build()
    private val reviews = DynPropertyFactory.createBoolean("publication.reviewsRequireModeration", true)
        .description("Модерация: reviews").build()
    private val loans = DynPropertyFactory.createBoolean("publication.loansRequireModeration", true)
        .description("Модерация: loans").build()
    private val pages = DynPropertyFactory.createBoolean("publication.pagesRequireModeration", true)
        .description("Модерация: pages").build()
    private val profileChanges = DynPropertyFactory.createBoolean("publication.profileChangesRequireModeration", true)
        .description("Модерация: profileChanges").build()
    private val avatars = DynPropertyFactory.createBoolean("publication.avatarsRequireModeration", true)
        .description("Модерация: avatars").build()

    fun current(): PublicationSettings = PublicationSettings(
        commentsRequireModeration = comments.value,
        photosRequireModeration = photos.value,
        momentsRequireModeration = moments.value,
        reviewsRequireModeration = reviews.value,
        loansRequireModeration = loans.value,
        pagesRequireModeration = pages.value,
        profileChangesRequireModeration = profileChanges.value,
        avatarsRequireModeration = avatars.value,
    )

    @Transactional
    fun update(input: PublicationSettings, actor: Actor): PublicationSettings {
        if (!actor.administrator) throw ForbiddenException()
        val before = current()
        updateValues(
            mapOf(
                "publication.commentsRequireModeration" to input.commentsRequireModeration.toString(),
                "publication.photosRequireModeration" to input.photosRequireModeration.toString(),
                "publication.momentsRequireModeration" to input.momentsRequireModeration.toString(),
                "publication.reviewsRequireModeration" to
                    (input.reviewsRequireModeration ?: input.commentsRequireModeration).toString(),
                "publication.loansRequireModeration" to
                    (input.loansRequireModeration ?: input.commentsRequireModeration).toString(),
                "publication.pagesRequireModeration" to
                    (input.pagesRequireModeration ?: before.pagesRequireModeration).toString(),
                "publication.profileChangesRequireModeration" to
                    (input.profileChangesRequireModeration ?: before.profileChangesRequireModeration).toString(),
                "publication.avatarsRequireModeration" to
                    (input.avatarsRequireModeration ?: before.avatarsRequireModeration).toString(),
            ),
            actor,
        )
        return current()
    }

    private fun updateValues(values: Map<String, String>, actor: Actor) {
        values.entries.stream().forEach { propertyService.update(it.key, it.value, null, actor.id.toString()) }
    }

    @Transactional(readOnly = true)
    fun user(id: UUID): UserModerationSettings =
        UserModerationSettings(users.findById(id).orElse(null)?.forceModeration ?: false)

    @Transactional
    fun updateUser(id: UUID, input: UserModerationSettings, actor: Actor): UserModerationSettings {
        if (!actor.administrator) throw ForbiddenException()
        val row = users.findById(id).orElseGet { UserModerationSettingsEntity(userId = id) }
        row.forceModeration = input.forceModeration
        row.updatedBy = actor.id
        row.updatedAt = clock.instant()
        users.saveAndFlush(row)
        return UserModerationSettings(row.forceModeration)
    }

    fun requiresReview(request: ModerationEntity): Boolean {
        if (users.findById(request.authorId).orElse(null)?.forceModeration == true) return true
        val policy = current()
        return when (request.kind) {
            ChangeKind.CREATE_COMMENT, ChangeKind.UPDATE_COMMENT, ChangeKind.DELETE_COMMENT,
            -> policy.commentsRequireModeration
            ChangeKind.CREATE_CREDIT, ChangeKind.UPDATE_CREDIT, ChangeKind.DELETE_CREDIT,
            -> policy.loansRequireModeration ?: true
            ChangeKind.UPDATE_RATING_COMMENT, ChangeKind.DELETE_RATING -> policy.reviewsRequireModeration ?: true
            ChangeKind.CREATE_PERSON -> policy.pagesRequireModeration ?: true
            ChangeKind.UPDATE_PERSON -> policy.profileChangesRequireModeration ?: true
            ChangeKind.PUBLISH_MEDIA, ChangeKind.UPDATE_MEDIA, ChangeKind.DELETE_MEDIA -> {
                when (media.findById(request.targetId).orElse(null)?.kind) {
                    MediaKind.AVATAR -> policy.avatarsRequireModeration ?: true
                    MediaKind.PHOTO -> policy.photosRequireModeration
                    MediaKind.MOMENT -> policy.momentsRequireModeration
                    else -> true
                }
            }
            else -> true
        }
    }
}
