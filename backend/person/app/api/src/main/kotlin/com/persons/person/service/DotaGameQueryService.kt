package com.persons.person.service

import com.persons.person.contract.dto.DotaMatch
import com.persons.person.contract.dto.DotaMatchEvent
import com.persons.person.contract.dto.DotaMatchEventPage
import com.persons.person.contract.dto.DotaMatchPage
import com.persons.person.contract.dto.PersonSummary
import com.persons.person.exception.impl.InvalidInputException
import com.persons.person.exception.impl.NotFoundException
import com.persons.person.maintenance.games.DotaMatchStore
import com.persons.person.transformer.DotaMatchTransformer
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Component
class DotaGameQueryService(
    private val matches: DotaMatchStore,
    private val access: PersonAccessService,
    private val transformer: DotaMatchTransformer,
) {
    @Transactional(readOnly = true)
    fun detail(id: UUID, matchId: String): DotaMatch {
        access.visible(id)
        val numericId = matchId.toLongOrNull()
        if (numericId == null || numericId <= 0 || numericId.toString() != matchId) throw InvalidInputException()
        val row = matches.detail(id, numericId)
        if (row == null) throw NotFoundException()
        return transformer.convert(row.match)
    }

    fun page(id: UUID, page: Int, size: Int): DotaMatchPage {
        access.visible(id)
        return DotaMatchPage(
            matches.page(id, page, size).stream().map { transformer.convert(it.match) }.toList(),
            matches.count(id), page, size,
        )
    }

    fun events(page: Int, size: Int): DotaMatchEventPage = DotaMatchEventPage(
        matches.page(null, page, size).stream().map {
            DotaMatchEvent(
                PersonSummary(it.personId, it.personTag, it.personName, it.avatarMediaId),
                transformer.convert(it.match),
            )
        }.toList(),
        matches.count(null), page, size,
    )
}
