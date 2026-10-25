package com.persons.person.maintenance.dao.entity

import java.io.Serializable
import java.util.UUID

data class CsMatchId(var personId: UUID = UUID.randomUUID(), var matchId: UUID = UUID.randomUUID()) : Serializable
