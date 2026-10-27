package com.persons.person.maintenance.dao.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.IdClass
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "person_dota_matches")
@IdClass(DotaMatchId::class)
class DotaMatchEntity(
    @Id @Column(name = "person_id") var personId: UUID = UUID.randomUUID(),
    @Id var matchId: Long = 0,
    var accountId: Long = 0,
    var playedAt: Instant = Instant.now(),
    var durationSeconds: Int = 0,
    var heroKey: String = "",
    var heroName: String = "",
    var won: Boolean = false,
    var kills: Int = 0,
    var deaths: Int = 0,
    var assists: Int = 0,
    var rankName: String? = null,
    var importedAt: Instant = Instant.now(),
    var heroDamage: Int? = null,
    var buildingDamage: Int? = null,
    var score: Int? = null,
    var opponentScore: Int? = null,
    var playerRankVerified: Boolean = false,
) {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id", insertable = false, updatable = false)
    lateinit var person: com.persons.person.dao.entity.PersonEntity
}
