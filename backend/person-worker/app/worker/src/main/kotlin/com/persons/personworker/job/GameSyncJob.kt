package com.persons.personworker.job

import com.persons.dynamicproperties.domain.PropertiesChanged
import com.persons.personworker.domain.GameIntegration
import jakarta.annotation.PreDestroy
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.scheduling.TaskScheduler
import org.springframework.stereotype.Component
import java.time.Clock
import java.util.concurrent.ScheduledFuture

@Component
@ConditionalOnProperty(name = ["jobs.enabled"], havingValue = "true", matchIfMissing = true)
class GameSyncJob(
    private val integrations: List<GameIntegration>,
    @param:Qualifier("gamesTaskScheduler") private val scheduler: TaskScheduler,
    private val clock: Clock,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val tasks = mutableMapOf<String, ScheduledFuture<*>>()
    private var started = false

    @Synchronized
    @EventListener(ApplicationReadyEvent::class)
    fun start() {
        started = true
        integrations.stream().forEach(::schedule)
    }

    @Synchronized
    @EventListener
    fun changed(event: PropertiesChanged) {
        if (started) {
            integrations.stream()
                .filter { integration -> event.keys.stream().anyMatch { it.startsWith("games.${integration.key}.") } }
                .forEach(::schedule)
        }
    }

    private fun schedule(integration: GameIntegration) {
        tasks.remove(integration.key)?.cancel(false)
        if (!integration.enabled) {
            return
        }
        tasks[integration.key] = scheduler.scheduleWithFixedDelay(
            {
                try {
                    integration.synchronize()
                } catch (exception: RuntimeException) {
                    log.error("Game integration {} failed", integration.key, exception)
                }
            },
            clock.instant(),
            integration.interval,
        )
    }

    @Synchronized
    @PreDestroy
    fun stop() {
        started = false
        tasks.values.stream().forEach { it.cancel(false) }
        tasks.clear()
    }
}
