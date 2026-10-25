package com.persons.person.service

import com.persons.person.contract.dto.ChangeKind
import com.persons.person.contract.dto.MediaKind
import com.persons.person.contract.dto.ModerationItem
import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.MediaRepository
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.ReviewStatus
import com.persons.person.transformer.toSummary
import org.springframework.stereotype.Service
import java.time.ZoneOffset
import java.util.stream.Collectors

@Service
class ModerationViewService(
    private val persons: PersonRepository,
    private val media: MediaRepository,
    private val authors: AuthorProfileService,
    private val comments: CommentRepository,
) {
    fun items(rows: List<ModerationEntity>): List<ModerationItem> {
        if (rows.isEmpty()) return emptyList()
        val people = persons.findAllById(rows.stream().map { it.personId }.distinct().toList()).stream()
            .collect(Collectors.toMap({ it.id }, { it.toSummary() }))
        val targets = rows.stream().map { it.targetId }.distinct().toList()
        val contexts = comments.findAllById(targets).mapNotNull { row ->
            (row.mediaId ?: row.momentId)?.let { row.id to it }
        }.toMap()
        val files = media.findAllById(targets + contexts.values).stream()
            .collect(Collectors.toMap({ it.id }, { it }))
        val names = rows.stream().flatMap { row ->
            listOfNotNull(row.authorId to row.authorName, row.reviewedBy?.let { it to "" }).stream()
        }.collect(Collectors.toMap({ it.first }, { it.second }, { first, _ -> first }))
        val identities = authors.profiles(names)
        return rows.stream().map { row ->
            val person = people[row.personId]
            val file = files[row.targetId] ?: files[contexts[row.targetId]]
            ModerationItem(
                id = row.id,
                personId = row.personId,
                personTag = person?.tag ?: row.personTag,
                kind = ChangeKind.valueOf(row.kind.name),
                summary = row.summary,
                payload = row.payload,
                previousPayload = row.previousPayload,
                authorName = identities[row.authorId]?.authorName?.ifBlank { row.authorName } ?: row.authorName,
                status = ModerationStatus.valueOf(row.status.name),
                createdAt = row.createdAt.atOffset(ZoneOffset.UTC),
                reason = row.reason,
                reviewedAt = row.reviewedAt?.atOffset(ZoneOffset.UTC),
                authorId = row.authorId,
                authorTag = identities[row.authorId]?.authorTag,
                authorAvatarUrl = identities[row.authorId]?.authorAvatarUrl,
                sizeBytes = file?.sizeBytes,
                personName = person?.fullName,
                personAvatarMediaId = person?.avatarMediaId,
                targetId = row.targetId,
                mediaId = file?.id,
                mediaKind = file?.kind?.let { kind -> MediaKind.entries.firstOrNull { it.name == kind.name } },
                previewAvailable = file?.previewObjectKey != null,
                reviewerName = row.reviewedBy?.let { identities[it]?.authorName?.ifBlank { null } },
                automatic = row.status == ReviewStatus.APPROVED && row.reviewedBy == null,
            )
        }.toList()
    }
}
