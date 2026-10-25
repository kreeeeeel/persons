package com.persons.personworker.domain

import java.time.Duration
import java.time.Instant

data class DotabuffSettings(val enabled: Boolean, val importFrom: Instant, val pollInterval: Duration)
