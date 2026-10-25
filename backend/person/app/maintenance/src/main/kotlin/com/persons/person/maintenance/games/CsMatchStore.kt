package com.persons.person.maintenance.games

import com.persons.leetify.domain.CsPlayerMatch
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.entity.SocialLinkEntity
import com.persons.person.domain.SocialNetwork
import com.persons.person.maintenance.dao.entity.CsMatchEntity
import com.persons.person.maintenance.dao.entity.CsMatchId
import com.persons.person.maintenance.dao.entity.LeetifySyncEntity
import com.persons.person.maintenance.dao.repository.CsMatchRepository
import com.persons.person.maintenance.dao.repository.PersonRecordRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.Duration
import java.util.UUID
import java.util.stream.Collectors

@Service
class CsMatchStore(
    private val matches: CsMatchRepository,
    private val persons: PersonRecordRepository,
    private val clock: Clock,
) {
    // The provider returns a rolling recent window; upsert it without deleting the archive.
    fun merge(person: UUID, records: List<CsPlayerMatch>) {
        // Keep the legacy column populated; current visibility uses the profile validation timestamp.
        val expiresAt = clock.instant().plus(Duration.ofDays(1))
        matches.saveAllAndFlush(
            records.stream().map {
                val record = CsMatchEntity(
                    person, it.matchId, it.steam64Id, it.playedAt, it.mapName, it.mode, it.outcome,
                    it.score, it.opponentScore, it.kills, it.deaths, it.assists, it.durationSeconds, it.rank,
                    it.faceitLevel,
                    it.faceitElo,
                    it.kd,
                    it.adr,
                    it.hsPercent,
                    it.leetifyRating,
                    it.personalPerformance,
                    expiresAt,

                )
                record.person = persons.getReferenceById(person)
                record
            }.toList(),
        )
    }

    fun delete(person: UUID) {
        matches.deleteByPersonId(person)
    }

    fun page(person: UUID?, page: Int, size: Int): List<StoredCsMatch> = stored(
        matches.findAll(
            visible(person),
            PageRequest.of(
                page,
                size,
                Sort.by(
                    Sort.Order.desc("playedAt"),
                    Sort.Order.desc("matchId"),
                    Sort.Order.asc("personId"),
                ),
            ),

        ).content,
    )

    fun selected(ids: List<CsMatchId>): List<StoredCsMatch> =
        if (ids.isEmpty()) emptyList() else stored(matches.findAllById(ids))

    fun detail(person: UUID, matchId: UUID): StoredCsMatch? {
        val record = matches.findOne(
            visible(person).and { row, _, builder -> builder.equal(row.get<UUID>("matchId"), matchId) },
        ).orElse(null)
        if (record == null) return null
        return stored(listOf(record)).first()
    }

    private fun stored(records: List<CsMatchEntity>): List<StoredCsMatch> = records.stream().map { row ->
        val owner = row.person
        StoredCsMatch(
            row.personId, owner.tag,
            listOfNotNull(owner.firstName, owner.lastName, owner.patronymic).stream()
                .filter { it.isNotBlank() }.collect(Collectors.joining(" ")),
            owner.avatarMediaId,
            CsPlayerMatch(
                row.matchId, row.steam64Id, row.playedAt, row.mapName, row.mode, row.outcome,
                row.score, row.opponentScore, row.kills, row.deaths, row.assists, row.durationSeconds,
                row.rankValue, row.faceitLevel, row.faceitElo, row.kd, row.adr, row.hsPercent,
                row.leetifyRating, row.personalPerformance,
            ),
        )
    }.toList()

    fun count(person: UUID?): Long = matches.count(visible(person))

    private fun visible(person: UUID?): Specification<CsMatchEntity> = Specification { row, query, builder ->
        if (query == null) {
            throw IllegalStateException("CS visibility requires a criteria query")
        }
        val owner = row.get<PersonEntity>("person")
        val linked = query.subquery(UUID::class.java)
        val link = linked.from(SocialLinkEntity::class.java)
        val state = linked.from(LeetifySyncEntity::class.java)
        linked.select(link.get("id")).where(
            builder.equal(link.get<UUID>("personId"), row.get<UUID>("personId")),
            builder.equal(link.get<SocialNetwork>("network"), SocialNetwork.STEAM),
            builder.equal(state.get<UUID>("personId"), row.get<UUID>("personId")),
            builder.equal(link.get<String>("value"), state.get<String>("snapshotSourceUrl")),
            builder.greaterThan(state.get("lastCompletedAt"), clock.instant().minus(Duration.ofDays(1))),
        )
        val visibility = builder.and(
            builder.isTrue(owner.get("published")), builder.isFalse(owner.get("deleted")),
            builder.exists(linked),
        )
        if (person == null) visibility else builder.and(visibility, builder.equal(row.get<UUID>("personId"), person))
    }
}
