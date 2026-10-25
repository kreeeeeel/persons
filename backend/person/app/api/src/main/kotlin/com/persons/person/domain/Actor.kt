package com.persons.person.domain

import java.util.UUID

data class Actor(val id: UUID, val name: String, val administrator: Boolean)
