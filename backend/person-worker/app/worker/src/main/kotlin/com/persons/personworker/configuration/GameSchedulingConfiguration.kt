package com.persons.personworker.configuration

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = ["jobs.enabled"], havingValue = "true", matchIfMissing = true)
class GameSchedulingConfiguration {
    @Bean("gamesTaskScheduler")
    fun scheduler(): ThreadPoolTaskScheduler = ThreadPoolTaskScheduler().apply {
        // A single consumer also prevents overlap when a running schedule is replaced.
        poolSize = 1
        setThreadNamePrefix("game-integration-")
        setWaitForTasksToCompleteOnShutdown(true)
        setAwaitTerminationSeconds(30)
        setRemoveOnCancelPolicy(true)
    }
}
