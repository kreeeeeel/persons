package com.persons.person.domain

import com.persons.person.contract.dto.CommunityFeedEvent
import com.persons.person.contract.dto.CommunityFeedKind
import com.persons.person.contract.dto.PersonSummary
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID

data class FeedEntry(val sourceId: String, val kind: CommunityFeedKind, val personId: UUID, val createdAt: Instant) {
    val id: String get() = "${kind.name}:$personId:$sourceId"
    fun event(page: PersonSummary): CommunityFeedEvent =
        CommunityFeedEvent(id, kind, page, createdAt.atOffset(ZoneOffset.UTC))
}
