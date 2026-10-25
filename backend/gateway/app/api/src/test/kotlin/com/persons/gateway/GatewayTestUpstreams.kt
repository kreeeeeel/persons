package com.persons.gateway

import com.fasterxml.jackson.databind.ObjectMapper
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

internal val USER_ID: UUID = UUID.fromString("b798de31-dc81-46ba-a820-2a98e5e9e335")
internal val ADMIN_ID: UUID = UUID.fromString("c50d709f-9eb6-4102-b21f-948e9aeb6714")

class GatewayTestUpstreams {
    val restrictions = ConcurrentHashMap<UUID, String>()
    val forwarded = AtomicInteger()
    val avatarRequests = AtomicInteger()
    var avatarStatus = 200
    var lastAvatarServiceHeader = ""
    var unavailable = false
    var idUnavailable = false
    var idAdminDelay: Duration = Duration.ZERO
    var restrictionReadDelay: Duration = Duration.ZERO
    var restrictionMutationDelay: Duration = Duration.ZERO
    var lastBody = ByteArray(0)
    var lastGatewayHeader = ""
    private val json = ObjectMapper()
    private val id = server(::identity)
    private val person = server(::person)
    private val policy = server(::restriction)
    val idUri = "http://127.0.0.1:${id.address.port}"
    val personUri = "http://127.0.0.1:${person.address.port}"
    val restrictionsUri = "http://127.0.0.1:${policy.address.port}"

    fun reset() {
        restrictions.clear()
        forwarded.set(0)
        avatarRequests.set(0)
        avatarStatus = 200
        lastAvatarServiceHeader = ""
        unavailable = false
        idUnavailable = false
        idAdminDelay = Duration.ZERO
        restrictionReadDelay = Duration.ZERO
        restrictionMutationDelay = Duration.ZERO
        lastBody = ByteArray(0)
        lastGatewayHeader = ""
    }

    fun ban(scope: String): String {
        val value = """{"id":"${UUID.randomUUID()}","userId":"$USER_ID","scopes":["$scope"],"reason":"Pause",
            "createdAt":"2026-10-20T00:00:00Z","expiresAt":"2099-01-01T00:00:00Z"}"""
        restrictions[USER_ID] = value
        return value
    }

    fun stop() {
        id.stop(0)
        person.stop(0)
        policy.stop(0)
    }

    private fun server(handler: (HttpExchange) -> Unit): HttpServer {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/") { exchange -> exchange.use { handler(it) } }
        server.start()
        return server
    }

    private fun identity(exchange: HttpExchange) {
        if (idUnavailable) {
            respond(exchange, 503, """{"code":"UNAVAILABLE","requestId":"test"}""")
            return
        }
        if (exchange.requestURI.path == "/internal/v1/users/$USER_ID/avatar") {
            avatarRequests.incrementAndGet()
            lastAvatarServiceHeader = exchange.requestHeaders.getFirst("X-Service-Authorization").orEmpty()
            if (avatarStatus == 404) {
                respond(exchange, 404, """{"code":"AVATAR_NOT_FOUND","requestId":"test"}""")
                return
            }
            val avatar = byteArrayOf(0xff.toByte(), 0xd8.toByte(), 1, 2, 0xff.toByte(), 0xd9.toByte())
            exchange.responseHeaders.add("Content-Type", "image/jpeg")
            exchange.sendResponseHeaders(200, avatar.size.toLong())
            exchange.responseBody.write(avatar)
        } else if (exchange.requestURI.path == "/internal/v1/admin/users") {
            if (!idAdminDelay.isZero) Thread.sleep(idAdminDelay.toMillis())
            respond(exchange, 200, """{"items":[],"total":0,"page":0,"size":5}""")
        } else if (exchange.requestURI.path == "/v1/me") {
            val token = exchange.requestHeaders.getFirst("Authorization")
            if (token !in setOf("Bearer user", "Bearer admin")) {
                respond(exchange, 401, """{"code":"UNAUTHORIZED","requestId":"test"}""")
                return
            }
            val role = if (token == "Bearer admin") "ADMIN" else "USER"
            val user = if (role == "ADMIN") ADMIN_ID else USER_ID
            respond(
                exchange, 200,
                """{"id":"$user","firstName":"User","lastName":"Test","email":"test@example.test",
                "locale":"ru","hasAvatar":false,"role":"$role"}""",
            )
        } else {
            respond(exchange, 200, "{}")
        }
    }

    private fun restriction(exchange: HttpExchange) {
        val delay = if (exchange.requestMethod == "GET") restrictionReadDelay else restrictionMutationDelay
        if (!delay.isZero) Thread.sleep(delay.toMillis())
        if (unavailable) {
            respond(exchange, 503, """{"code":"UNAVAILABLE","requestId":"test"}""")
            return
        }
        if (exchange.requestURI.path.endsWith("/lookup")) {
            val ids = json.readTree(exchange.requestBody)["userIds"].map { UUID.fromString(it.asText()) }
            respond(exchange, 200, ids.mapNotNull(restrictions::get).joinToString(",", "[", "]"))
            return
        }
        val user = UUID.fromString(exchange.requestURI.path.split('/')[3])
        if (exchange.requestURI.path.endsWith("/access")) {
            val change = json.readTree(exchange.requestBody)
            respond(
                exchange, 200,
                """{"id":"$user","email":"user@example.test","firstName":"User","lastName":"Test",
                    "role":${change["role"]},"status":${change["status"]},"createdAt":"2026-10-20T00:00:00Z"}""",
            )
            return
        }
        when (exchange.requestMethod) {
            "PUT" -> {
                val body = json.readTree(exchange.requestBody)
                val value = """{"id":"${UUID.randomUUID()}","userId":"$user","scopes":${body["scopes"]},
                    "reason":${body["reason"]},"createdAt":"2026-10-20T00:00:00Z"}"""
                restrictions[user] = value
                respond(exchange, 200, value)
            }
            "DELETE" -> {
                restrictions.remove(user)
                exchange.sendResponseHeaders(204, -1)
            }
            else -> respond(exchange, 200, "{\"restriction\":${restrictions[user] ?: "null"}}")
        }
    }

    private fun person(exchange: HttpExchange) {
        forwarded.incrementAndGet()
        lastGatewayHeader = exchange.requestHeaders.getFirst("X-Gateway-Authorization").orEmpty()
        lastBody = exchange.requestBody.readAllBytes()
        if (exchange.requestHeaders.getFirst("Range") == "bytes=0-3") {
            exchange.responseHeaders.add("Content-Range", "bytes 0-3/6")
            exchange.responseHeaders.add("Content-Type", "application/octet-stream")
            exchange.sendResponseHeaders(206, 4)
            exchange.responseBody.write(byteArrayOf(0, 1, 2, 3))
        } else {
            respond(exchange, 200, "{\"forwarded\":true}")
        }
    }

    private fun respond(exchange: HttpExchange, status: Int, body: String) {
        val bytes = body.toByteArray(StandardCharsets.UTF_8)
        exchange.responseHeaders.add("Content-Type", "application/json")
        exchange.sendResponseHeaders(status, bytes.size.toLong())
        exchange.responseBody.write(bytes)
    }
}
