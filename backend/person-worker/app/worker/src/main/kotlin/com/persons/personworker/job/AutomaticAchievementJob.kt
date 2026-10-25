package com.persons.personworker.job

import com.persons.personworker.dao.AutomaticAchievementRepository
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Clock

private const val BATCH_SIZE = 500

@Component
class AutomaticAchievementJob(private val achievements: AutomaticAchievementRepository, private val clock: Clock) {
    @Scheduled(
        fixedDelayString = "\${jobs.achievements-delay}",
        initialDelayString = "\${jobs.achievements-initial-delay}",
    )
    fun run() {
        achievements.grantDue(clock.instant(), BATCH_SIZE)
    }
}
