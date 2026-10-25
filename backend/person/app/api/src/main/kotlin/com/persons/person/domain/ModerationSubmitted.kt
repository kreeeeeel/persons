package com.persons.person.domain

import java.util.UUID

data class ModerationSubmitted(val id: UUID, val administrator: Boolean = false)
