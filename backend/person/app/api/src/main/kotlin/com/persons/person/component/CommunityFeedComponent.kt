package com.persons.person.component

import com.persons.person.contract.dto.Achievement
import com.persons.person.contract.dto.AchievementType
import com.persons.person.contract.dto.CommunityFeedEvent
import com.persons.person.contract.dto.CommunityFeedFilter
import com.persons.person.contract.dto.CommunityFeedKind
import com.persons.person.contract.dto.CommunityFeedPage
import com.persons.person.contract.dto.PersonAchievement
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.repository.AchievementRepository
import com.persons.person.dao.repository.PersonAchievementRepository
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.FeedEntry
import com.persons.person.maintenance.dao.entity.CsMatchId
import com.persons.person.maintenance.dao.entity.DotaMatchId
import com.persons.person.maintenance.games.CsMatchStore
import com.persons.person.maintenance.games.DotaMatchStore
import com.persons.person.service.CommunityFeedDao
import com.persons.person.transformer.CsMatchTransformer
import com.persons.person.transformer.DotaMatchTransformer
import com.persons.person.transformer.toSummary
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Isolation
import org.springframework.transaction.annotation.Transactional
import java.time.ZoneOffset
import java.util.UUID
import java.util.stream.Collectors
import java.util.stream.Stream

@Component
class CommunityFeedComponent(
    private val feed: CommunityFeedDao,
    private val persons: PersonRepository,
    private val text: CommunityFeedTextAssembler,
    private val media: CommunityFeedMediaAssembler,
    private val grants: PersonAchievementRepository,
    private val achievements: AchievementRepository,
    private val dota: DotaMatchStore,
    private val cs: CsMatchStore,
    private val dotaTransformer: DotaMatchTransformer,
    private val csTransformer: CsMatchTransformer,
) {
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    fun page(actor: Actor?, page: Int, size: Int, kind: CommunityFeedFilter?): CommunityFeedPage {
        val rows = feed.page(page, size, kind)
        if (rows.isEmpty) return CommunityFeedPage(emptyList(), rows.totalElements, page, size)
        val pages = persons.findAllById(rows.content.stream().map { it.personId }.distinct().toList())
            .stream().collect(Collectors.toMap({ it.id }, { it }))
        val events = Stream.of(
            text.assemble(rows.content, pages, actor), media.assemble(rows.content, pages, actor),
            achievements(rows.content, pages), games(rows.content, pages),
        ).flatMap { it.stream() }.collect(Collectors.toMap({ it.id }, { it }))
        return CommunityFeedPage(
            rows.content.stream().map {
                events.getValue(it.id)
            }.toList(),
            rows.totalElements, page, size,
        )
    }

    private fun achievements(entries: List<FeedEntry>, pages: Map<UUID, PersonEntity>): List<CommunityFeedEvent> {
        val selected = entries.stream().filter { it.kind == CommunityFeedKind.ACHIEVEMENT }
            .collect(Collectors.toMap({ UUID.fromString(it.sourceId) }, { it }))
        if (selected.isEmpty()) return emptyList()
        val rows = grants.findAllById(selected.keys)
        val definitions = achievements.findAllById(rows.stream().map { it.achievementId }.distinct().toList())
            .stream().collect(Collectors.toMap({ it.id }, { it }))
        return rows.stream().map { row ->
            val achievement = definitions.getValue(row.achievementId)
            selected.getValue(row.id).event(pages.getValue(row.personId).toSummary()).copy(
                achievement = PersonAchievement(
                    row.id,
                    Achievement(
                        achievement.id, achievement.title, achievement.description, achievement.active,
                        achievement.createdAt.atOffset(ZoneOffset.UTC), achievement.version ?: 0,
                        AchievementType.valueOf(achievement.type.name), achievement.pageAgeYears,
                    ),
                    row.assignedAt.atOffset(ZoneOffset.UTC), row.note,
                ),
            )
        }.toList()
    }

    private fun games(entries: List<FeedEntry>, pages: Map<UUID, PersonEntity>): List<CommunityFeedEvent> {
        val selected = entries.stream().collect(Collectors.toMap({ it.id }, { it }))
        val dotaIds = entries.stream().filter { it.kind == CommunityFeedKind.DOTA }
            .map { DotaMatchId(it.personId, it.sourceId.toLong()) }.toList()
        val csIds = entries.stream().filter { it.kind == CommunityFeedKind.CS }
            .map { CsMatchId(it.personId, UUID.fromString(it.sourceId)) }.toList()
        return Stream.concat(
            dota.selected(dotaIds).stream().map {
                selected.getValue("DOTA:${it.personId}:${it.match.matchId}")
                    .event(pages.getValue(it.personId).toSummary())
                    .copy(dota = dotaTransformer.convert(it.match))
            },
            cs.selected(csIds).stream().map {
                selected.getValue("CS:${it.personId}:${it.match.matchId}")
                    .event(pages.getValue(it.personId).toSummary())
                    .copy(cs = csTransformer.convert(it.match))
            },
        ).toList()
    }
}
