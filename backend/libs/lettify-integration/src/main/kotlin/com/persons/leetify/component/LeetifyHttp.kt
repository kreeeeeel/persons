package com.persons.leetify.component

import com.persons.leetify.configuration.LeetifyProperties
import com.persons.leetify.exception.LeetifyException
import org.apache.hc.client5.http.DnsResolver
import org.apache.hc.client5.http.SystemDefaultDnsResolver
import org.apache.hc.client5.http.classic.methods.HttpGet
import org.apache.hc.client5.http.config.ConnectionConfig
import org.apache.hc.client5.http.config.RequestConfig
import org.apache.hc.client5.http.config.TlsConfig
import org.apache.hc.client5.http.impl.classic.HttpClients
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder
import org.apache.hc.client5.http.ssl.ClientTlsStrategyBuilder
import org.apache.hc.core5.ssl.SSLContexts
import org.apache.hc.core5.util.Timeout
import java.io.Closeable
import java.io.IOException
import java.time.Duration
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

class LeetifyHttp internal constructor(
    private val properties: LeetifyProperties,
    dnsResolver: DnsResolver,
) : Closeable {
    constructor(properties: LeetifyProperties) : this(properties, SystemDefaultDnsResolver.INSTANCE)

    private val connectTimeout = Timeout.ofMilliseconds(minOf(properties.timeout.toMillis(), 5000))
    private val client =
        HttpClients
            .custom()
            .setConnectionManager(
                PoolingHttpClientConnectionManagerBuilder
                    .create()
                    .setDnsResolver(dnsResolver)
                    .setDefaultConnectionConfig(
                        ConnectionConfig
                            .custom()
                            .setConnectTimeout(connectTimeout)
                            .setSocketTimeout(Timeout.of(properties.timeout))
                            .build(),
                    ).setDefaultTlsConfig(TlsConfig.custom().setHandshakeTimeout(connectTimeout).build())
                    .setTlsSocketStrategy(
                        ClientTlsStrategyBuilder
                            .create()
                            .setSslContext(SSLContexts.createSystemDefault())
                            .setTlsVersions("TLSv1.2")
                            .buildClassic(),
                    ).build(),
            ).setDefaultRequestConfig(RequestConfig.custom().setResponseTimeout(Timeout.of(properties.timeout)).build())
            .disableRedirectHandling()
            .disableAutomaticRetries()
            .build()
    private var nextRequest = 0L

    @Synchronized
    fun get(path: String): String {
        if (!path.startsWith("/") ||
            path.startsWith("//") ||
            properties.timeout.isNegative ||
            properties.timeout.isZero ||
            properties.requestInterval.isNegative
        ) {
            throw LeetifyException("INVALID_CONFIGURATION")
        }
        val request = HttpGet(properties.baseUrl.resolve(path))
        request.addHeader("Accept", "application/json")
        request.addHeader("User-Agent", "PersonsLeetifyIntegration/1.0")
        if (properties.apiKey.isNotBlank()) {
            request.addHeader("_leetify_key", properties.apiKey)
        }
        try {
            val delay = nextRequest - System.nanoTime()
            if (delay > 0) {
                Thread.sleep(Duration.ofNanos(delay))
            }
            return send(request)
        } catch (exception: InterruptedException) {
            Thread.currentThread().interrupt()
            throw LeetifyException("INTERRUPTED", cause = exception)
        } catch (exception: IOException) {
            throw LeetifyException(
                if (Thread.currentThread().isInterrupted) "INTERRUPTED" else "UNAVAILABLE",
                cause = exception,
            )
        } finally {
            nextRequest = System.nanoTime() + properties.requestInterval.toNanos()
        }
    }

    private fun send(
        request: HttpGet,
        retries: Int = 2,
    ): String =
        try {
            client.execute(request) { response ->
                if (response.code !in 200..299) {
                    throw LeetifyException("HTTP_${response.code}", retry(response.getFirstHeader("Retry-After")?.value ?: ""))
                }
                val bytes = response.entity?.content?.readNBytes(properties.maxResponseBytes + 1) ?: byteArrayOf()
                if (bytes.size > properties.maxResponseBytes) {
                    throw LeetifyException("RESPONSE_TOO_LARGE")
                }
                String(bytes, Charsets.UTF_8)
            }
        } catch (exception: IOException) {
            if (retries == 0 || Thread.currentThread().isInterrupted) {
                throw exception
            }
            Thread.sleep(properties.requestInterval)
            send(request, retries - 1)
        }

    private fun retry(value: String): Duration? {
        val seconds = value.toLongOrNull()
        if (seconds != null) {
            return Duration.ofSeconds(seconds.coerceIn(0, 86400))
        }
        return try {
            Duration
                .between(
                    java.time.Instant.now(),
                    ZonedDateTime.parse(value, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant(),
                ).coerceIn(Duration.ZERO, Duration.ofDays(1))
        } catch (_: DateTimeParseException) {
            null
        }
    }

    override fun close() {
        client.close()
    }
}
