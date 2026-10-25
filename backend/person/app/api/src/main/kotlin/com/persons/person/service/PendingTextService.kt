package com.persons.person.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import org.springframework.stereotype.Service
import java.util.UUID
import java.util.stream.Collectors

private const val TEXT = "text"

@Service
class PendingTextService(private val requests: ModerationRepository, private val mapper: ObjectMapper) {
    fun texts(ids: List<UUID>, kind: ChangeKind, actor: Actor?, field: String = TEXT): Map<UUID, String> = if (actor ==
        null
    ) {
        emptyMap()
    } else {
        requests.pendingChanges(ids, actor.id, kind).stream()
            .collect(Collectors.toMap({ it.targetId }, { mapper.readTree(it.payload).get(field).asText() }))
    }
}
