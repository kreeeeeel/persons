package com.persons.person.controller

import com.persons.person.contract.api.GamesApi
import com.persons.person.contract.dto.CsMatch
import com.persons.person.contract.dto.CsMatchEventPage
import com.persons.person.contract.dto.CsMatchPage
import com.persons.person.contract.dto.DotaMatch
import com.persons.person.contract.dto.DotaMatchEventPage
import com.persons.person.contract.dto.DotaMatchPage
import com.persons.person.service.CsGameQueryService
import com.persons.person.service.DotaGameQueryService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class GamesController(private val games: DotaGameQueryService, private val cs: CsGameQueryService) : GamesApi {
    override fun getDotaMatch(id: UUID, matchId: String): ResponseEntity<DotaMatch> =
        ResponseEntity.ok(games.detail(id, matchId))

    override fun getCsMatch(id: UUID, matchId: UUID): ResponseEntity<CsMatch> =
        ResponseEntity.ok(cs.detail(id, matchId))

    override fun listCsMatches(id: UUID, page: Int, size: Int): ResponseEntity<CsMatchPage> =
        ResponseEntity.ok(cs.page(id, page, size))

    override fun listCsMatchEvents(page: Int, size: Int): ResponseEntity<CsMatchEventPage> =
        ResponseEntity.ok(cs.events(page, size))

    override fun listDotaMatches(id: UUID, page: Int, size: Int): ResponseEntity<DotaMatchPage> =
        ResponseEntity.ok(games.page(id, page, size))

    override fun listDotaMatchEvents(page: Int, size: Int): ResponseEntity<DotaMatchEventPage> =
        ResponseEntity.ok(games.events(page, size))
}
