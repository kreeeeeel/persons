package com.persons.gateway

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.io.IOException
import java.net.InetSocketAddress
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class SseTestUpstream {
    private val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
    private val heartbeat = Executors.newSingleThreadScheduledExecutor()
    private val streams = ConcurrentHashMap<UUID, HttpExchange>()
    val uri = "http://127.0.0.1:${server.address.port}"
    val activeStreams: Int get() = streams.size

    fun start() {
        server.createContext("/v1/dynamic-properties/events", ::events)
        server.createContext("/") { exchange ->
            exchange.use {
                val bytes = "{\"forwarded\":true}".toByteArray()
                exchange.responseHeaders.add("Content-Type", "application/json")
                exchange.sendResponseHeaders(200, bytes.size.toLong())
                exchange.responseBody.write(bytes)
            }
        }
        server.start()
        heartbeat.scheduleWithFixedDelay({
            streams.entries.stream().forEach { write(it.key, it.value, ": keepalive\n\n") }
        }, 50, 50, TimeUnit.MILLISECONDS)
    }

    private fun events(exchange: HttpExchange) {
        exchange.responseHeaders.add("Content-Type", "text/event-stream")
        exchange.responseHeaders.add("Cache-Control", "no-store")
        exchange.sendResponseHeaders(200, 0)
        val id = UUID.randomUUID()
        streams[id] = exchange
        write(id, exchange, "data: []\n\n")
    }

    private fun write(id: UUID, exchange: HttpExchange, value: String) {
        try {
            synchronized(exchange) {
                exchange.responseBody.write(value.toByteArray())
                exchange.responseBody.flush()
            }
        } catch (exception: IOException) {
            streams.remove(id)
            exchange.close()
        }
    }

    fun stop() {
        heartbeat.shutdownNow()
        streams.values.stream().forEach(HttpExchange::close)
        streams.clear()
        server.stop(0)
    }
}
