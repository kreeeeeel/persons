package com.persons.gateway.component

import org.springframework.http.MediaType
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter
import java.io.IOException
import java.nio.ByteBuffer
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Flow
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

class SseResponseSubscriber(private val emitter: ResponseBodyEmitter) : Flow.Subscriber<List<ByteBuffer>> {
    private val cancelled = AtomicBoolean()
    private val subscription = AtomicReference<Flow.Subscription>()
    private val upstream = AtomicReference<CompletableFuture<*>>()

    fun attach(future: CompletableFuture<*>) {
        upstream.set(future)
        if (cancelled.get()) future.cancel(true)
    }

    fun isCancelled(): Boolean = cancelled.get()

    fun cancel() {
        if (cancelled.compareAndSet(false, true)) {
            subscription.get()?.cancel()
            upstream.get()?.cancel(true)
        }
    }

    override fun onSubscribe(value: Flow.Subscription) {
        if (!subscription.compareAndSet(null, value) || cancelled.get()) {
            value.cancel()
        } else {
            value.request(1)
        }
    }

    override fun onNext(buffers: List<ByteBuffer>) {
        if (cancelled.get()) return
        try {
            buffers.stream().forEachOrdered { buffer ->
                val bytes = ByteArray(buffer.remaining())
                buffer.get(bytes)
                // ResponseBodyEmitter flushes each send; preserve upstream SSE framing and heartbeats verbatim.
                emitter.send(bytes, MediaType.APPLICATION_OCTET_STREAM)
            }
            if (!cancelled.get()) subscription.get()?.request(1)
        } catch (exception: IOException) {
            onError(exception)
        } catch (exception: IllegalStateException) {
            onError(exception)
        }
    }

    override fun onError(throwable: Throwable) {
        if (!cancelled.get()) {
            cancel()
            emitter.completeWithError(throwable)
        }
    }

    override fun onComplete() {
        if (!cancelled.get()) {
            cancel()
            emitter.complete()
        }
    }
}
