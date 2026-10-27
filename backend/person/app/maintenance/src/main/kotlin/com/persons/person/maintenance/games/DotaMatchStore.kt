package com.persons.person.maintenance.games

import com.persons.dotabuff.domain.DotaItem
import com.persons.dotabuff.domain.DotaMatchReference
import com.persons.dotabuff.domain.DotaPlayerMatch
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.maintenance.dao.entity.DotaItemEntity
import com.persons.person.maintenance.dao.entity.DotaMatchEntity
import com.persons.person.maintenance.dao.entity.DotaMatchId
import com.persons.person.maintenance.dao.entity.DotaNeutralItemEntity
import com.persons.person.maintenance.dao.repository.DotaItemRepository
import com.persons.person.maintenance.dao.repository.DotaMatchRepository
import com.persons.person.maintenance.dao.repository.DotaNeutralItemRepository
import com.persons.person.maintenance.dao.repository.PersonRecordRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import java.time.Clock
import java.util.UUID
import java.util.stream.Collectors

@Service
class DotaMatchStore(
    private val matches: DotaMatchRepository,
    private val items: DotaItemRepository,
    private val neutralItems: DotaNeutralItemRepository,
    private val persons: PersonRecordRepository,
    private val clock: Clock,
) {
    fun known(person: UUID, ids: List<Long>): Set<Long> {
        if (ids.isEmpty()) {
            return emptySet()
        }
        return matches.findAll { row, _, builder ->
            builder.and(builder.equal(row.get<UUID>("personId"), person), row.get<Long>("matchId").`in`(ids))
        }.stream().map { it.matchId }.collect(Collectors.toSet())
    }

    // Parent match and all inventory rows form one immutable imported event.
    fun insert(person: UUID, match: DotaPlayerMatch) {
        val existing = matches.findById(DotaMatchId(person, match.matchId)).orElse(null)
        if (existing != null) {
            if (!existing.playerRankVerified) {
                existing.rankName = match.rank
                existing.playerRankVerified = true
                matches.save(existing)
            }
            return
        }
        val record = DotaMatchEntity(
            person, match.matchId, match.accountId, match.playedAt,
            match.durationSeconds, match.heroKey, match.heroName, match.won, match.kills, match.deaths, match.assists,
            match.rank, clock.instant(), match.heroDamage, match.buildingDamage,
            match.score, match.opponentScore,
        )
        record.person = persons.getReferenceById(person)
        record.playerRankVerified = true
        matches.saveAndFlush(record)
        items.saveAll(
            match.items.stream().map {
                DotaItemEntity(person, match.matchId, it.slot, it.key, it.name, it.acquiredAtSeconds)
            }.toList(),
        )
        val neutral = match.neutralItem
        if (neutral != null) {
            neutralItems.save(
                DotaNeutralItemEntity(
                    person,
                    match.matchId,
                    neutral.key,
                    neutral.name,
                    neutral.acquiredAtSeconds,
                ),
            )
        }
        matches.flush()
    }

    fun page(person: UUID?, page: Int, size: Int): List<StoredDotaMatch> {
        val records = matches.findAll(
            visible(person),
            PageRequest.of(
                page, size,
                Sort.by(Sort.Order.desc("playedAt"), Sort.Order.desc("matchId"), Sort.Order.asc("personId")),
            ),
        ).content
        return stored(records)
    }

    fun ranksToRepair(person: UUID, account: Long, limit: Int): List<DotaMatchReference> = matches.findAll(
        { row, _, builder ->
            builder.and(
                builder.equal(row.get<UUID>("personId"), person),
                builder.equal(row.get<Long>("accountId"), account),
                builder.isFalse(row.get("playerRankVerified")),
            )
        },
        PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "playedAt", "matchId")),
    ).content.stream().map { DotaMatchReference(it.matchId, it.playedAt) }.toList()

    fun selected(ids: List<DotaMatchId>): List<StoredDotaMatch> =
        if (ids.isEmpty()) emptyList() else stored(matches.findAllById(ids))

    fun detail(person: UUID, matchId: Long): StoredDotaMatch? {
        val record = matches.findOne(
            visible(person).and { row, _, builder -> builder.equal(row.get<Long>("matchId"), matchId) },
        ).orElse(null)
        if (record == null) return null
        return stored(listOf(record)).first()
    }

    private fun stored(records: List<DotaMatchEntity>): List<StoredDotaMatch> {
        if (records.isEmpty()) {
            return emptyList()
        }
        val ids = records.stream().map { it.matchId }.distinct().toList()
        val people = records.stream().map { it.personId }.distinct().toList()
        val inventory = items.findAll { row, _, builder ->
            builder.and(row.get<UUID>("personId").`in`(people), row.get<Long>("matchId").`in`(ids))
        }.stream().collect(Collectors.groupingBy { DotaMatchId(it.personId, it.matchId) })
        val neutrals = neutralItems.findAll { row, _, builder ->
            builder.and(row.get<UUID>("personId").`in`(people), row.get<Long>("matchId").`in`(ids))
        }.stream().collect(Collectors.toMap({ DotaMatchId(it.personId, it.matchId) }, { it }))
        return records.stream().map { row ->
            val owner = row.person
            val key = DotaMatchId(row.personId, row.matchId)
            val neutral = neutrals[key]
            StoredDotaMatch(
                row.personId, owner.tag,
                listOfNotNull(owner.firstName, owner.lastName, owner.patronymic).stream()
                    .filter { it.isNotBlank() }.collect(Collectors.joining(" ")),
                owner.avatarMediaId,
                DotaPlayerMatch(
                    row.matchId, row.accountId, row.playedAt, row.durationSeconds,
                    row.heroKey, row.heroName, row.won, row.kills, row.deaths, row.assists,
                    row.rankName.takeIf {
                        row.playerRankVerified
                    },
                    inventory[key].orEmpty().stream().sorted(compareBy { it.slot }).map {
                        DotaItem(it.itemKey, it.itemName, it.slot, it.acquiredAtSeconds)
                    }.toList(),
                    row.heroDamage, row.buildingDamage,
                    neutral?.let { DotaItem(it.itemKey, it.itemName, 6, it.acquiredAtSeconds) },
                    row.score, row.opponentScore,
                ),
            )
        }.toList()
    }

    fun count(person: UUID?): Long = matches.count(visible(person))

    private fun visible(person: UUID?): Specification<DotaMatchEntity> = Specification { row, _, builder ->
        val owner = row.get<PersonEntity>("person")
        val visibility = builder.and(builder.isTrue(owner.get("published")), builder.isFalse(owner.get("deleted")))
        if (person == null) visibility else builder.and(visibility, builder.equal(row.get<UUID>("personId"), person))
    }
}
