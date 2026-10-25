package com.persons.dynamicproperties

import com.persons.dynamicproperties.component.DynPropertyRegistry
import com.persons.dynamicproperties.component.DynPropertyService
import com.persons.dynamicproperties.controller.DynPropertyEventsController
import com.persons.dynamicproperties.domain.PropertiesChanged
import com.persons.dynamicproperties.storage.MemoryDynPropertyBackend
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.context.ApplicationEventPublisher
import org.springframework.test.util.ReflectionTestUtils
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.io.IOException
import java.util.concurrent.CopyOnWriteArraySet

class DynPropertyEventsControllerTest {
    @Test
    fun `a disconnected event subscriber does not fail property updates or other subscribers`() {
        val service = DynPropertyService(DynPropertyRegistry(), MemoryDynPropertyBackend(), ApplicationEventPublisher { })
        val controller = DynPropertyEventsController(service)
        val disconnected = Mockito.mock(SseEmitter::class.java)
        val connected = Mockito.mock(SseEmitter::class.java)
        Mockito
            .doThrow(IOException("Disconnected"))
            .`when`(disconnected)
            .send(Mockito.any(SseEmitter.SseEventBuilder::class.java))
        Mockito.doThrow(IllegalStateException("Async context already completed")).`when`(disconnected).complete()
        ReflectionTestUtils.setField(controller, "emitters", CopyOnWriteArraySet(listOf(disconnected, connected)))

        try {
            controller.changed(PropertiesChanged(setOf("publication.commentRequireModeration")))
            controller.changed(PropertiesChanged(setOf("publication.photoRequireModeration")))
            Mockito.verify(disconnected).send(Mockito.any(SseEmitter.SseEventBuilder::class.java))
            Mockito.verify(disconnected, Mockito.never()).complete()
            Mockito.verify(connected, Mockito.times(2)).send(Mockito.any(SseEmitter.SseEventBuilder::class.java))
        } finally {
            controller.close()
        }
    }
}
