package com.persons.person.domain

import java.time.Instant

data class ModerationCount(val status: ReviewStatus, val total: Long, val oldest: Instant)
