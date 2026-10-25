package com.persons.person.maintenance.dao.entity

import java.io.Serializable
import java.util.UUID

data class RatingOptionTotalId(var personId: UUID = UUID.randomUUID(), var optionId: UUID = UUID.randomUUID()) :
    Serializable
