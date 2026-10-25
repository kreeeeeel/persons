package com.persons.person.domain

import java.util.UUID

data class OwnershipClaim(val accountId: UUID, val message: String, val mediaId: UUID)
