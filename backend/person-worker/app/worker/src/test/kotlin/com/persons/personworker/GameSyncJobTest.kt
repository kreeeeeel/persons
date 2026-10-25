package com.persons.personworker

import com.persons.dynamicproperties.domain.PropertiesChanged
import com.persons.personworker.domain.GameIntegration
import com.persons.personworker.job.GameSyncJob
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito
import org.springframework.scheduling.TaskScheduler
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ScheduledFuture

class GameSyncJobTest {
    @Test
    fun `schedule changes replace the future directly and disabling cancels it without a polling task`() {
        val integration = Mockito.mock(GameIntegration::class.java)
        val scheduler = Mockito.mock(TaskScheduler::class.java)
        val future = Mockito.mock(ScheduledFuture::class.java)
        val now = Instant.parse("2026-10-22T00:00:00Z")
        Mockito.`when`(integration.key).thenReturn("dotabuff")
        Mockito.`when`(integration.enabled).thenReturn(true)
        Mockito.`when`(integration.interval).thenReturn(Duration.ofMinutes(5))
        Mockito.doReturn(future).`when`(scheduler).scheduleWithFixedDelay(
            any(Runnable::class.java), any(Instant::class.java), any(Duration::class.java),
        )
        val job = GameSyncJob(listOf(integration), scheduler, Clock.fixed(now, java.time.ZoneOffset.UTC))
        job.start()
        Mockito.verify(scheduler).scheduleWithFixedDelay(
            any(Runnable::class.java), Mockito.eq(now), Mockito.eq(Duration.ofMinutes(5)),
        )
        job.changed(PropertiesChanged(setOf("site.marqueeEnabled")))
        Mockito.verifyNoInteractions(future)
        Mockito.`when`(integration.interval).thenReturn(Duration.ofMinutes(1))
        job.changed(PropertiesChanged(setOf("games.dotabuff.pollIntervalSeconds")))
        Mockito.verify(future).cancel(false)
        Mockito.verify(scheduler).scheduleWithFixedDelay(
            any(Runnable::class.java), Mockito.eq(now), Mockito.eq(Duration.ofMinutes(1)),
        )
        Mockito.`when`(integration.enabled).thenReturn(false)
        job.changed(PropertiesChanged(setOf("games.dotabuff.enabled")))
        Mockito.verify(future, Mockito.times(2)).cancel(false)
        job.stop()
    }
}
