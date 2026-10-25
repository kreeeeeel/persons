package com.persons.restrictions.domain

import java.time.Instant

data class RestrictionChange(val scopes: Set<RestrictionScope>, val reason: String, val expiresAt: Instant?)
