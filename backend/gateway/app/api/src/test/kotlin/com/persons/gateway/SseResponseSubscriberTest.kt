package com.persons.gateway

import com.persons.gateway.component.SseResponseSubscriber
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.eq
import org.mockito.Mockito.doThrow
import org.mockito.Mockito.inOrder
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.springframework.http.MediaType
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter
import java.io.IOException
import java.nio.ByteBuffer
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Flow

class SseResponseSubscriberTest {
    private val emitter = mock(ResponseBodyEmitter::class.java)
    private val subscription = mock(Flow.Subscription::class.java)
    private val subscriber = SseResponseSubscriber(emitter)

    @Test
    fun `requests one batch at a time and forwards exact bytes before requesting more`() {
        val bytes = ": keepalive\n\ndata: []\n\n".toByteArray()
        subscriber.onSubscribe(subscription)
        subscriber.onNext(listOf(ByteBuffer.wrap(bytes)))

        val order = inOrder(subscription, emitter)
        order.verify(subscription).request(1)
        order.verify(emitter).send(eq(bytes), eq(MediaType.APPLICATION_OCTET_STREAM))
        order.verify(subscription).request(1)
        verify(subscription, never()).cancel()
    }

    @Test
    fun `a disconnected writer cancels upstream and does not request more`() {
        val failure = IOException("Client disconnected")
        doThrow(failure).`when`(emitter).send(any(), eq(MediaType.APPLICATION_OCTET_STREAM))
        subscriber.onSubscribe(subscription)
        subscriber.onNext(listOf(ByteBuffer.wrap("data: []\n\n".toByteArray())))

        verify(subscription).request(1)
        verify(subscription).cancel()
        verify(emitter).completeWithError(failure)
        assertThat(subscriber.isCancelled()).isTrue()
    }

    @Test
    fun `cancellation before headers prevents late upstream and subscription work`() {
        val future = CompletableFuture<Void>()
        subscriber.cancel()
        subscriber.attach(future)
        subscriber.onSubscribe(subscription)
        subscriber.onNext(listOf(ByteBuffer.wrap("data: []\n\n".toByteArray())))

        assertThat(future.isCancelled).isTrue()
        verify(subscription).cancel()
        verify(subscription, never()).request(1)
        verify(emitter, never()).send(any(), any())
    }

    @Test
    fun `EOF completes the emitter and cancels its subscription once`() {
        subscriber.onSubscribe(subscription)
        subscriber.onComplete()
        subscriber.onComplete()
        subscriber.cancel()

        verify(subscription).cancel()
        verify(emitter).complete()
        assertThat(subscriber.isCancelled()).isTrue()
    }
}
