package com.persons.person.component

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.contract.dto.CommentInput
import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.dao.repository.MomentRepository
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.util.stream.Collectors

@Component
class PendingCommentRestorer(
    private val requests: ModerationRepository,
    private val comments: CommentRepository,
    private val moments: MomentRepository,
    private val mapper: ObjectMapper,
) {
    @EventListener(ApplicationReadyEvent::class)
    @Transactional
    fun restore() {
        val pending = requests.pendingComments()
        val existing = comments.findAllById(pending.stream().map { it.targetId }.toList()).stream()
            .map { it.id }.collect(Collectors.toSet())
        val inputs = pending.stream().filter { it.targetId !in existing }.collect(
            Collectors.toMap(
                { it.targetId }, { mapper.readValue(it.payload, CommentInput::class.java) },
            ),
        )
        val momentMedia = moments.findAllById(
            inputs.values.stream().flatMap {
                java.util.stream.Stream.ofNullable(it.momentId)
            }.toList(),
        )
            .stream().collect(Collectors.toMap({ it.id }, { it.mediaId }))
        val rows = pending.stream().filter { it.targetId !in existing }.map {
            val input = inputs.getValue(it.targetId)
            val mediaId = input.mediaId ?: momentMedia[input.momentId]
            CommentEntity(
                id = it.targetId, personId = it.personId, momentId = input.momentId, mediaId = mediaId,
                authorId = it.authorId,
                authorName = it.authorName,
                text = input.text,
                createdAt = it.createdAt,
                published = false,

            )
        }.toList()
        comments.saveAll(rows)
    }
}
