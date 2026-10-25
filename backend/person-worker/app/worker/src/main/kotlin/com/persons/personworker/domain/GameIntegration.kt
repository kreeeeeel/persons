package com.persons.personworker.domain

import java.time.Duration

interface GameIntegration {
    val key: String
    val enabled: Boolean
    val interval: Duration
    fun synchronize()
}
