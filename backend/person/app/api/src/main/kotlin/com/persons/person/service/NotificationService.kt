package com.persons.person.service

import com.persons.person.contract.dto.Notification
import com.persons.person.contract.dto.NotificationPage
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.entity.NotificationEntity
import com.persons.person.dao.repository.NotificationRepository
import com.persons.person.domain.NotificationKind
import com.persons.person.domain.ReviewStatus
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.ZoneOffset
import java.util.UUID

private const val ID = "id"
private const val CREATED_AT = "createdAt"

@Service
class NotificationService(private val notifications: NotificationRepository, private val clock: Clock) {
    @Transactional(readOnly = true)
    fun page(userId: UUID, page: Int, size: Int): NotificationPage {
        val rows = notifications.page(userId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, CREATED_AT, ID)))

        return NotificationPage(
            rows.content.stream().map {
                Notification(
                    it.id, com.persons.person.contract.dto.NotificationKind.valueOf(it.kind.name),
                    it.personTag, it.subject, it.createdAt.atOffset(ZoneOffset.UTC), it.readAt != null, it.reason,
                )
            }.toList(),
            rows.totalElements, page, size, notifications.unread(userId),
        )
    }

    @Transactional
    fun markRead(userId: UUID) {
        notifications.markRead(userId, clock.instant())
    }

    fun decision(request: ModerationEntity) {
        notifications.save(
            NotificationEntity(
                userId = request.authorId, personTag = request.personTag,
                kind = if (request.status ==
                    ReviewStatus.APPROVED
                ) {
                    NotificationKind.APPROVED
                } else {
                    NotificationKind.REJECTED
                },
                subject = request.summary, reason = request.reason, createdAt = clock.instant(),
            ),
        )
    }

    fun removed(userId: UUID, request: ModerationEntity) {
        if (userId != request.authorId) {
            notifications.save(
                NotificationEntity(
                    userId = userId, personTag = request.personTag,
                    kind = NotificationKind.REMOVED, subject = request.summary,
                    reason = request.reason, createdAt = clock.instant(),
                ),
            )
        }
    }
}
