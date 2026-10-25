package com.persons.person.maintenance.dao.entity

import com.persons.leetify.domain.CsMatchMode
import com.persons.leetify.domain.CsMatchOutcome
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.IdClass
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "person_cs_matches")
@IdClass(CsMatchId::class)
class CsMatchEntity(
    @Id @Column(name = "person_id") var personId: UUID = UUID.randomUUID(),
    @Id var matchId: UUID = UUID.randomUUID(),
    @Column(name = "steam64_id") var steam64Id: String = "",
    var playedAt: Instant = Instant.now(),
    var mapName: String = "",
    @Enumerated(EnumType.STRING) var mode: CsMatchMode = CsMatchMode.OTHER,
    @Enumerated(EnumType.STRING) var outcome: CsMatchOutcome = CsMatchOutcome.DRAW,
    var score: Int = 0,
    var opponentScore: Int = 0,
    var kills: Int = 0,
    var deaths: Int = 0,
    var assists: Int = 0,
    var durationSeconds: Int? = null,
    var rankValue: Int? = null,
    var faceitLevel: Int? = null,
    var faceitElo: Int? = null,
    var kd: Double? = null,
    var adr: Double? = null,
    var hsPercent: Double? = null,
    var leetifyRating: Double? = null,
    var personalPerformance: Double? = null,
    var expiresAt: Instant = Instant.now(),
) {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id", insertable = false, updatable = false)
    lateinit var person: com.persons.person.dao.entity.PersonEntity
}
