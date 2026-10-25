package com.persons.person.maintenance.dao.entity

import java.io.Serializable
import java.util.UUID

data class DotaMatchId(var personId: UUID = UUID.randomUUID(), var matchId: Long = 0) : Serializable
