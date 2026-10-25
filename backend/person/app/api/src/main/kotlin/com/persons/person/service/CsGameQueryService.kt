package com.persons.person.service

import com.persons.person.contract.dto.CsMatch
import com.persons.person.contract.dto.CsMatchEvent
import com.persons.person.contract.dto.CsMatchEventPage
import com.persons.person.contract.dto.CsMatchPage
import com.persons.person.contract.dto.PersonSummary
import com.persons.person.exception.impl.NotFoundException
import com.persons.person.maintenance.games.CsMatchStore
import com.persons.person.transformer.CsMatchTransformer
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Component
class CsGameQueryService(
    private val matches: CsMatchStore,
    private val access: PersonAccessService,
    private val transformer: CsMatchTransformer,
) {
    @Transactional(readOnly = true)
    fun detail(id: UUID, matchId: UUID): CsMatch {
        access.visible(id)
        val row = matches.detail(id, matchId)
        if (row == null) throw NotFoundException()
        return transformer.convert(row.match)
    }

    fun page(id: UUID, page: Int, size: Int): CsMatchPage {
        access.visible(id)
        return CsMatchPage(
            matches.page(id, page, size).stream().map {
                transformer.convert(it.match)
            }.toList(),
            matches.count(id), page, size,
        )
    }

    fun events(page: Int, size: Int): CsMatchEventPage = CsMatchEventPage(
        matches.page(null, page, size).stream().map {
            CsMatchEvent(
                PersonSummary(
                    it.personId,
                    it.personTag,
                    it.personName,
                    it.avatarMediaId,
                ),
                transformer.convert(it.match),
            )
        }.toList(),
        matches.count(null), page, size,
    )
}
