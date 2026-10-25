package com.persons.person.service

import com.persons.person.contract.dto.Achievement
import com.persons.person.contract.dto.AchievementGrantInput
import com.persons.person.contract.dto.AchievementGrantResult
import com.persons.person.contract.dto.AchievementInput
import com.persons.person.contract.dto.AchievementPage
import com.persons.person.contract.dto.PersonAchievement
import com.persons.person.contract.dto.PersonAchievementPage
import com.persons.person.dao.entity.AchievementEntity
import com.persons.person.dao.entity.PersonAchievementEntity
import com.persons.person.dao.repository.AchievementRepository
import com.persons.person.dao.repository.PersonAchievementRepository
import com.persons.person.dao.specification.matching
import com.persons.person.domain.AchievementType
import com.persons.person.domain.Actor
import com.persons.person.domain.StoredImage
import com.persons.person.exception.impl.ConflictException
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.InvalidInputException
import com.persons.person.exception.impl.NotFoundException
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.ZoneOffset
import java.util.UUID
import java.util.stream.Collectors
import com.persons.person.contract.dto.AchievementType as ApiAchievementType

private const val ID = "id"
private const val CREATED_AT = "createdAt"
private const val ASSIGNED_AT = "assignedAt"
private const val DELETED = "deleted"
private const val MAX_TITLE = 100
private const val MAX_DESCRIPTION = 1000
private const val MAX_RECIPIENTS = 100
private const val MAX_NOTE = 500
private const val MIN_PAGE_AGE_YEARS = 1
private const val MAX_PAGE_AGE_YEARS = 5

@Service
class AchievementService(
    private val achievements: AchievementRepository,
    private val grants: PersonAchievementRepository,
    private val access: PersonAccessService,
    private val garbage: StorageGarbageService,
    private val clock: Clock,
) {
    fun validate(
        title: String,
        description: String,
        type: ApiAchievementType = ApiAchievementType.MANUAL,
        pageAgeYears: Int? = null,
        active: Boolean = true,
    ) {
        if (title.trim().isEmpty() ||
            title.length > MAX_TITLE ||
            description.length > MAX_DESCRIPTION
        ) {
            throw InvalidInputException()
        }

        if ((type == ApiAchievementType.MANUAL && pageAgeYears != null) ||
            (
                type == ApiAchievementType.AUTOMATIC &&
                    (pageAgeYears == null || pageAgeYears !in MIN_PAGE_AGE_YEARS..MAX_PAGE_AGE_YEARS)
                )
        ) {
            throw InvalidInputException()
        }
    }

    @Transactional(readOnly = true)
    fun page(page: Int, size: Int, query: String = ""): AchievementPage {
        val rows = achievements.findAll(
            matching<AchievementEntity>(DELETED to false).and { row, _, builder ->
                val text = "%${query.trim().lowercase().replace("!", "!!").replace("%", "!%")
                    .replace("_", "!_")}%"
                builder.or(
                    builder.like(builder.lower(row.get("title")), text, '!'),
                    builder.like(builder.lower(row.get("description")), text, '!'),
                )
            },
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, CREATED_AT, ID)),
        )
        return AchievementPage(rows.content.stream().map(::dto).toList(), rows.totalElements, page, size)
    }

    @Transactional
    fun create(
        title: String,
        description: String,
        image: StoredImage,
        type: ApiAchievementType = ApiAchievementType.MANUAL,
        pageAgeYears: Int? = null,
        active: Boolean = true,
    ): Achievement {
        validate(title, description, type, pageAgeYears)
        val row = achievements.saveAndFlush(
            AchievementEntity(
                title = title.trim(), description = description.trim(),
                active = active,
                imageObjectKey = image.key,
                imageContentType = image.contentType,
                imageSize = image.size,
                createdAt = clock.instant(),
                type = AchievementType.valueOf(type.value),
                pageAgeYears = pageAgeYears,
            ),
        )
        garbage.attach(image.key)
        return dto(row)
    }

    @Transactional
    fun update(id: UUID, input: AchievementInput): Achievement {
        val row = locked(id)
        if (row.version != input.version) {
            throw ConflictException()
        }

        val type = input.type ?: ApiAchievementType.valueOf(row.type.name)
        val pageAgeYears = if (type == ApiAchievementType.AUTOMATIC) {
            input.pageAgeYears ?: row.pageAgeYears
        } else {
            input.pageAgeYears
        }
        validate(input.title, input.description, type, pageAgeYears)

        row.title = input.title.trim()
        row.description = input.description.trim()
        row.active = input.active
        row.type = AchievementType.valueOf(type.value)
        row.pageAgeYears = pageAgeYears
        achievements.flush()
        return dto(row)
    }

    @Transactional
    fun image(id: UUID, image: StoredImage): Achievement {
        val row = locked(id)
        garbage.attach(image.key, row.imageObjectKey)
        row.imageObjectKey = image.key
        row.imageContentType = image.contentType
        row.imageSize = image.size
        achievements.flush()
        return dto(row)
    }

    @Transactional
    fun delete(id: UUID) {
        val row = locked(id)
        row.active = false
        row.deleted = true
        garbage.retire(row.imageObjectKey)
    }

    @Transactional(readOnly = true)
    fun readable(id: UUID, actor: Actor?): AchievementEntity {
        val row = achievements.findById(id).orElseThrow { NotFoundException() }
        if (row.deleted || (!row.active && actor?.administrator != true)) {
            throw NotFoundException()
        }
        return row
    }

    @Transactional
    fun grant(id: UUID, input: AchievementGrantInput, actor: Actor): AchievementGrantResult {
        if (!actor.administrator) throw ForbiddenException()
        val achievement = locked(id)
        if (!achievement.active || achievement.type != AchievementType.MANUAL) {
            throw ConflictException()
        }
        if (input.personIds.isEmpty() ||
            input.personIds.size > MAX_RECIPIENTS ||
            input.note.orEmpty().length > MAX_NOTE
        ) {
            throw InvalidInputException()
        }
        val recipients = input.personIds.stream().distinct().sorted().map { access.locked(it) }.toList()
        val existing = grants.existing(id, recipients.stream().map { it.id }.toList())
        val created = recipients.stream().filter { it.id !in existing }.map {
            PersonAchievementEntity(
                personId = it.id, achievementId = id, assignedBy = actor.id,
                assignedAt = clock.instant(), note = input.note.orEmpty().trim(),
            )
        }.toList()
        grants.saveAll(created)
        return AchievementGrantResult(created.size.toLong())
    }

    @Transactional
    fun revoke(id: UUID, personId: UUID) {
        if (locked(id).type != AchievementType.MANUAL) {
            throw ConflictException()
        }
        grants.byPersonAndAchievement(personId, id)?.let { grants.delete(it) }
    }

    @Transactional(readOnly = true)
    fun personPage(personId: UUID, page: Int, size: Int, actor: Actor?): PersonAchievementPage {
        access.visible(personId, actor)
        val rows = grants.page(
            personId,
            PageRequest.of(
                page,
                size,
                Sort.by(
                    Sort.Direction.DESC,
                    ASSIGNED_AT,
                    ID,
                ),
            ),
        )
        val active = achievements.findAllById(rows.content.stream().map { it.achievementId }.toList())
            .stream().collect(Collectors.toMap({ it.id }, { it }))
        return PersonAchievementPage(
            rows.content.stream().map {
                PersonAchievement(
                    it.id,
                    dto(active.getValue(it.achievementId)),
                    it.assignedAt.atOffset(ZoneOffset.UTC),
                    it.note,
                )
            }.toList(),
            rows.totalElements, page, size,
        )
    }

    private fun locked(id: UUID): AchievementEntity = achievements.locked(id) ?: throw NotFoundException()
    private fun dto(row: AchievementEntity): Achievement = Achievement(
        id = row.id,
        title = row.title,
        description = row.description,
        active = row.active,
        createdAt = row.createdAt.atOffset(ZoneOffset.UTC),
        version = row.version ?: 0,
        type = ApiAchievementType.valueOf(row.type.name),
        pageAgeYears = row.pageAgeYears,
    )
}
