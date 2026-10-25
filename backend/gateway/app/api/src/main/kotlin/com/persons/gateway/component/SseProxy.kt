package com.persons.gateway.component

import com.persons.gateway.configuration.properties.GatewayProperties
import com.persons.gateway.exception.impl.UnavailableException
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

@Component
class SseProxy(private val client: HttpClient, private val properties: GatewayProperties) {
    fun forward(request: HttpRequest, response: HttpServletResponse): ResponseBodyEmitter {
        val emitter = ResponseBodyEmitter(properties.requestTimeout.toMillis())
        val subscriber = SseResponseSubscriber(emitter)
        emitter.onCompletion(subscriber::cancel)
        emitter.onTimeout {
            subscriber.cancel()
            emitter.complete()
        }
        emitter.onError { subscriber.cancel() }
        val upstream = client.sendAsync(request, HttpResponse.BodyHandlers.ofPublisher())
        subscriber.attach(upstream)
        upstream.whenComplete { result, exception ->
            if (exception != null) {
                subscriber.onError(UnavailableException(exception))
            } else {
                if (!subscriber.isCancelled()) copyProxyResponseHeaders(result, response)
                result.body().subscribe(subscriber)
            }
        }
        return emitter
    }
}
