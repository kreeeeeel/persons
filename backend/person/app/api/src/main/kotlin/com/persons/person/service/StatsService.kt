package com.persons.person.service

import com.persons.person.contract.dto.PersonStats
import com.persons.person.contract.dto.Reputation
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.MomentRepository
import com.persons.person.dao.repository.PhotoRepository
import com.persons.person.dao.repository.ProfileViewRepository
import com.persons.person.maintenance.PersonAggregateStore
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class StatsService(
    private val comments: CommentRepository,
    private val aggregates: PersonAggregateStore,
    private val views: ProfileViewRepository,
    private val moments: MomentRepository,
    private val photos: PhotoRepository,
) {
    fun get(id: UUID, reputationOverride: Reputation? = null): PersonStats {
        val aggregate = aggregates.get(id)

        return PersonStats(
            comments = comments.total(id),
            ratings = aggregate.ratingCount,
            views = views.total(id),
            moments = moments.total(id),
            photos = photos.total(id),
            creditEntries = aggregate.loanCount,
            creditScore = aggregate.loanScore,
            reputation = reputationOverride ?: Reputation.valueOf(aggregate.reputation.name),
            ratingAverage = aggregate.ratingAverage,
            calculationPending = aggregate.calculationPending,
            calculatedAt = aggregate.calculatedAt?.atOffset(java.time.ZoneOffset.UTC),
        )
    }
}
