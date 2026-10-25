package com.persons.dynamicproperties.controller

import com.persons.dynamicproperties.component.DynPropertyService
import com.persons.dynamicproperties.domain.PropertiesChanged
import jakarta.annotation.PreDestroy
import org.springframework.context.event.EventListener
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.io.IOException
import java.util.concurrent.CopyOnWriteArraySet
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@RestController
class DynPropertyEventsController(
    private val service: DynPropertyService,
) {
    private val emitters = CopyOnWriteArraySet<SseEmitter>()
    private val heartbeat =
        Executors.newSingleThreadScheduledExecutor { task ->
            Thread(task, "dyn-property-sse-heartbeat").also { it.isDaemon = true }
        }

    fun start() {
        heartbeat.scheduleWithFixedDelay({
            emitters.stream().forEach { emitter -> send(emitter, SseEmitter.event().comment("keepalive")) }
        }, 15, 15, TimeUnit.SECONDS)
    }

    @GetMapping("/v1/dynamic-properties/events", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    @Synchronized
    fun events(): SseEmitter {
        val emitter = SseEmitter(0L)
        emitters.add(emitter)
        emitter.onCompletion { emitters.remove(emitter) }
        emitter.onTimeout { emitters.remove(emitter) }
        emitter.onError { emitters.remove(emitter) }
        send(emitter, SseEmitter.event().data(service.current(true)))
        return emitter
    }

    @EventListener
    @Synchronized
    fun changed(event: PropertiesChanged) {
        if (event.keys.isNotEmpty()) {
            val values = service.current(true)
            emitters.stream().forEach { send(it, SseEmitter.event().data(values)) }
        }
    }

    private fun send(
        emitter: SseEmitter,
        event: SseEmitter.SseEventBuilder,
    ) {
        try {
            emitter.send(event)
        } catch (exception: IOException) {
            emitters.remove(emitter)
        } catch (exception: IllegalStateException) {
            emitters.remove(emitter)
        }
    }

    @PreDestroy
    fun close() {
        heartbeat.shutdownNow()
        emitters.stream().forEach { it.complete() }
    }
}
