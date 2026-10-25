package com.persons.gateway.component

import com.persons.gateway.configuration.properties.GatewayProperties
import com.persons.gateway.exception.impl.InvalidInputException
import com.persons.gateway.exception.impl.UnavailableException
import com.persons.requestobservability.SignedJwt
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter
import java.io.IOException
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Instant
import java.util.Collections
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

private const val GATEWAY_HEADER = "X-Gateway-Authorization"
private val HOP_HEADERS = setOf(
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer",
    "transfer-encoding", "upgrade", "host", "content-length", "expect", GATEWAY_HEADER.lowercase(Locale.ROOT),
)
private const val TOKEN_TTL_SECONDS = 60L
private const val GATEWAY_SCOPE = "gateway"
private const val PERSON_AUDIENCE = "persons-person"

@Component
class StreamingProxy(
    private val client: HttpClient,
    private val properties: GatewayProperties,
    private val events: SseProxy,
) {
    fun forward(request: HttpServletRequest, response: HttpServletResponse): ResponseBodyEmitter? {
        val upstream = request.requestURI.substringAfter('/').substringBefore('/')
        val base = when (upstream) {
            "id" -> properties.idUri
            "person" -> properties.personUri
            else -> throw InvalidInputException()
        }
        val path = request.requestURI.removePrefix("/$upstream")
        val query = request.queryString?.let { "?$it" }.orEmpty()
        val target = URI.create(base.trimEnd('/') + path + query)
        val connectionHeaders = request.getHeader("Connection").orEmpty().split(',').stream()
            .map { it.trim().lowercase(Locale.ROOT) }.toList().toSet()
        val requestBuilder = HttpRequest.newBuilder(target).timeout(properties.requestTimeout)
        Collections.list(request.headerNames).stream().filter {
            it.lowercase(Locale.ROOT) !in HOP_HEADERS && it.lowercase(Locale.ROOT) !in connectionHeaders
        }.forEach { name ->
            Collections.list(request.getHeaders(name)).stream().forEach { requestBuilder.header(name, it) }
        }
        if (upstream == "person") {
            val now = Instant.now()
            val authorization = SignedJwt(properties.jwtSecret).issue(
                GATEWAY_SCOPE, PERSON_AUDIENCE, GATEWAY_SCOPE, now,
                now.plusSeconds(TOKEN_TTL_SECONDS),
            )
            requestBuilder.header(GATEWAY_HEADER, "Bearer $authorization")
        }
        val opened = AtomicBoolean()
        val body = if (request.contentLengthLong == 0L || request.method in setOf("GET", "HEAD", "OPTIONS")) {
            HttpRequest.BodyPublishers.noBody()
        } else {
            HttpRequest.BodyPublishers.ofInputStream {
                if (!opened.compareAndSet(false, true)) throw IOException("A streamed request cannot be replayed")
                request.inputStream
            }
        }
        val targetRequest = requestBuilder.method(request.method, body).build()
        if (request.method == "GET" && path == "/v1/dynamic-properties/events") {
            return events.forward(targetRequest, response)
        }
        val result = try {
            client.send(targetRequest, HttpResponse.BodyHandlers.ofInputStream())
        } catch (exception: IOException) {
            throw UnavailableException(exception)
        } catch (exception: InterruptedException) {
            Thread.currentThread().interrupt()
            throw UnavailableException(exception)
        }
        result.body().use { content ->
            copyProxyResponseHeaders(result, response)
            content.transferTo(response.outputStream)
        }
        return null
    }
}

internal fun copyProxyResponseHeaders(result: HttpResponse<*>, response: HttpServletResponse) {
    response.status = result.statusCode()
    val responseConnection = result.headers().firstValue("Connection").orElse("").split(',').stream()
        .map { it.trim().lowercase(Locale.ROOT) }.toList().toSet()
    result.headers().map().entries.stream().filter {
        (it.key.lowercase(Locale.ROOT) !in HOP_HEADERS || it.key.equals("Content-Length", true)) &&
            it.key.lowercase(Locale.ROOT) !in responseConnection
    }.forEach { header -> header.value.stream().forEach { response.addHeader(header.key, it) } }
}
