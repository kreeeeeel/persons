package com.persons.dotabuff.component

import com.persons.dotabuff.configuration.DotabuffProperties
import com.persons.dotabuff.exception.DotabuffException
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
import java.net.URI
import java.time.Duration

class DotabuffHttp internal constructor(
    private val properties: DotabuffProperties,
    dnsResolver: DnsResolver,
) : Closeable {
    constructor(properties: DotabuffProperties) : this(properties, SystemDefaultDnsResolver.INSTANCE)

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

    fun dota(path: String): String = get(properties.baseUrl, path)

    fun steam(path: String): String = get(properties.steamBaseUrl, path)

    fun opendota(path: String): String = get(properties.openDotaBaseUrl, path)

    @Synchronized
    private fun get(
        origin: URI,
        path: String,
    ): String {
        if (!path.startsWith("/") ||
            path.startsWith("//") ||
            properties.timeout.isNegative ||
            properties.timeout.isZero ||
            properties.requestInterval.isNegative
        ) {
            throw DotabuffException("INVALID_CONFIGURATION")
        }
        val request = HttpGet(origin.resolve(path))
        request.addHeader("User-Agent", "PersonsGameIntegration/1.0")
        request.addHeader("Accept-Language", "en")
        try {
            val delay = nextRequest - System.nanoTime()
            if (delay > 0) {
                Thread.sleep(Duration.ofNanos(delay))
            }
            return send(request)
        } catch (exception: InterruptedException) {
            Thread.currentThread().interrupt()
            throw DotabuffException("INTERRUPTED", cause = exception)
        } catch (exception: IOException) {
            throw DotabuffException(
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
                    val seconds = response.getFirstHeader("Retry-After")?.value?.toLongOrNull()
                    throw DotabuffException("HTTP_${response.code}", seconds?.coerceIn(0, 86400)?.let(Duration::ofSeconds))
                }
                val bytes = response.entity?.content?.readNBytes(properties.maxResponseBytes + 1) ?: byteArrayOf()
                if (bytes.size > properties.maxResponseBytes) {
                    throw DotabuffException("RESPONSE_TOO_LARGE")
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

    override fun close() {
        client.close()
    }
}
