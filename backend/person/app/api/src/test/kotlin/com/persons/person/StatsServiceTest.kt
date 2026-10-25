package com.persons.person

import com.persons.person.contract.dto.Reputation
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.MomentRepository
import com.persons.person.dao.repository.PhotoRepository
import com.persons.person.dao.repository.ProfileViewRepository
import com.persons.person.maintenance.AggregateReputation
import com.persons.person.maintenance.PersonAggregate
import com.persons.person.maintenance.PersonAggregateStore
import com.persons.person.service.StatsService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import java.time.Instant
import java.util.UUID

class StatsServiceTest {
    @Test
    fun `returns the worker snapshot while a new calculation is queued`() {
        val personId = UUID.randomUUID()
        val aggregates = Mockito.mock(PersonAggregateStore::class.java)
        val calculatedAt = Instant.parse("2026-10-18T00:00:00Z")
        Mockito.`when`(aggregates.get(personId)).thenReturn(
            PersonAggregate(12, 4.5, 3, 1, AggregateReputation.GOOD, calculatedAt, calculationPending = true),
        )
        val service = StatsService(
            Mockito.mock(CommentRepository::class.java), aggregates,
            Mockito.mock(ProfileViewRepository::class.java), Mockito.mock(MomentRepository::class.java),
            Mockito.mock(PhotoRepository::class.java),
        )
        val stats = service.get(personId)
        assertThat(stats.reputation).isEqualTo(Reputation.GOOD)
        assertThat(stats.ratings).isEqualTo(12)
        assertThat(stats.ratingAverage).isEqualTo(4.5)
        assertThat(stats.creditEntries).isEqualTo(3)
        assertThat(stats.creditScore).isEqualTo(1)
        assertThat(stats.calculatedAt?.toInstant()).isEqualTo(calculatedAt)
        assertThat(stats.calculationPending).isTrue()
        assertThat(service.get(personId, Reputation.BAD).reputation).isEqualTo(Reputation.BAD)
        assertThat(service.get(personId).reputation).isEqualTo(Reputation.GOOD)
    }
}
