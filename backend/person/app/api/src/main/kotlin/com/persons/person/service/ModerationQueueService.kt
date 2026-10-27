package com.persons.person.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.contract.dto.ModerationItem
import com.persons.person.contract.dto.ModerationOrder
import com.persons.person.contract.dto.ModerationPage
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.ModerationStatistics
import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.domain.ErrorCode
import com.persons.person.domain.ModerationFilter
import com.persons.person.domain.ModerationSubmitted
import com.persons.person.domain.ReviewStatus
import com.persons.person.exception.impl.ConflictException
import com.persons.person.exception.impl.InvalidInputException
import com.persons.person.exception.impl.NotFoundException
import com.persons.person.exception.impl.PendingLimitException
import org.springframework.context.ApplicationEventPublisher
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Duration
import java.time.ZoneOffset
import java.util.UUID
import java.util.stream.Collectors

private const val MAX_PENDING_PER_ACCOUNT = 25L
private const val CREATED_AT = "createdAt"

@Service
class ModerationQueueService(
    private val requests: ModerationRepository,
    private val mapper: ObjectMapper,
    private val clock: Clock,
    private val events: ApplicationEventPublisher,
    private val access: PersonAccessService,
    private val views: ModerationViewService,
) {
    @Transactional
    fun submit(
        person: PersonEntity,
        target: UUID,
        kind: ChangeKind,
        actor: Actor,
        summary: String,
        payload: Any = emptyMap<String, String>(),
        reason: String? = null,
        previousPayload: Any? = null,
    ): ModerationReceipt {
        // Acquire the parent lock before queries can flush rows referencing it.
        access.locked(person.id)
        if (requests.pendingForTarget(target, kind)) {
            throw ConflictException(ErrorCode.PENDING_CHANGE)
        }

        val request = requests.save(
            ModerationEntity(
                personId = person.id,
                personTag = person.tag,
                targetId = target,
                kind = kind,
                authorId = actor.id,
                authorName = actor.name,
                summary = summary,
                payload = mapper.writeValueAsString(payload),
                previousPayload = previousPayload?.let(mapper::writeValueAsString),
                reason = reason?.trim()?.ifEmpty { null },
                createdAt = clock.instant(),
            ),
        )

        reviewSubmission(request, actor.administrator)
        if (request.status == ReviewStatus.PENDING && requests.pendingForAuthor(actor.id) > MAX_PENDING_PER_ACCOUNT) {
            throw PendingLimitException()
        }
        return ModerationReceipt(request.id, ModerationStatus.valueOf(request.status.name), personId = person.id)
    }

    fun reviewSubmission(request: ModerationEntity, administrator: Boolean = false) {
        events.publishEvent(ModerationSubmitted(request.id, administrator))
    }

    @Transactional(readOnly = true)
    fun page(status: ReviewStatus, page: Int, size: Int): ModerationPage =
        page(ModerationFilter(status = status), page, size, ModerationOrder.OLDEST)

    @Transactional(readOnly = true)
    fun page(filter: ModerationFilter, page: Int, size: Int, order: ModerationOrder): ModerationPage {
        if (filter.createdFrom != null && filter.createdTo != null && filter.createdFrom >= filter.createdTo) {
            throw InvalidInputException()
        }
        val sort = when (order) {
            ModerationOrder.OLDEST -> Sort.by(Sort.Direction.ASC, CREATED_AT, "id")
            ModerationOrder.NEWEST -> Sort.by(Sort.Direction.DESC, CREATED_AT, "id")
            ModerationOrder.AUTHOR -> Sort.by(Sort.Order.asc("authorName").ignoreCase())
                .and(Sort.by(CREATED_AT, "id"))
            ModerationOrder.TYPE -> Sort.by("kind", CREATED_AT, "id")
        }
        val rows = requests.page(filter, PageRequest.of(page, size, sort))
        val counts = requests.counts(filter).stream().collect(Collectors.toMap({ it.status }, { it }))
        val statistics = ModerationStatistics(
            pending = counts[ReviewStatus.PENDING]?.total ?: 0,
            approved = counts[ReviewStatus.APPROVED]?.total ?: 0,
            rejected = counts[ReviewStatus.REJECTED]?.total ?: 0,
            overdue = requests.overdue(filter, clock.instant().minus(Duration.ofDays(1))),
            automaticApproved = requests.automaticCount(filter),
            oldestPendingAt = counts[ReviewStatus.PENDING]?.oldest?.atOffset(ZoneOffset.UTC),
        )
        return ModerationPage(views.items(rows.content), rows.totalElements, page, size, statistics)
    }

    @Transactional(readOnly = true)
    fun item(id: UUID): ModerationItem = dto(requests.findById(id).orElseThrow { NotFoundException() })

    fun locked(id: UUID): ModerationEntity = requests.locked(id) ?: throw NotFoundException(ErrorCode.CONTENT_NOT_FOUND)

    fun personId(id: UUID): UUID = requests.personId(id) ?: throw NotFoundException(ErrorCode.CONTENT_NOT_FOUND)

    fun pendingRows(personId: UUID): List<ModerationEntity> = requests.pendingRows(personId)

    fun dto(row: ModerationEntity): ModerationItem = views.items(listOf(row)).first()
}
