package com.persons.person.maintenance.dao.entity

import java.io.Serializable
import java.util.UUID

data class DotaItemId(var personId: UUID = UUID.randomUUID(), var matchId: Long = 0, var slot: Int = 0) : Serializable
