package com.persons.personworker.job

import com.persons.personworker.exception.RestrictionExpiryFailedException
import com.persons.restrictions.client.RestrictionsClient
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Duration

private val UPSTREAM_TIMEOUT = Duration.ofSeconds(5)

@Component
class RestrictionExpiryJob(private val restrictions: RestrictionsClient) {
    @Scheduled(fixedDelayString = "\${jobs.restrictions-delay}")
    fun run() {
        val result = restrictions.api.expireRestrictions().block(UPSTREAM_TIMEOUT)
        if (result == null) throw RestrictionExpiryFailedException()
    }
}
