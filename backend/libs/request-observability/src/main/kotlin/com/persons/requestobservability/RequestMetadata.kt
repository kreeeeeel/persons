package com.persons.requestobservability

import jakarta.servlet.http.HttpServletRequest

private const val BEARER_PREFIX_LENGTH = 7
private const val MAX_IP_LENGTH = 64
private const val MAX_USER_AGENT_LENGTH = 512
private const val MAX_METADATA_LENGTH = 80
private const val MAX_ORIGIN_LENGTH = 200
private const val MAX_REGION_LENGTH = 160

class RequestMetadata(secret: String) {
    private val tokens = SignedJwt(secret)

    fun trustedService(request: HttpServletRequest): Boolean {
        val value = request.getHeader("X-Service-Authorization").orEmpty()

        if (!value.startsWith("Bearer ")) {
            return false
        }

        return tokens.verify(
            value.substring(BEARER_PREFIX_LENGTH),
            "persons-internal",
            "service",
        ) !=
            null
    }

    fun client(request: HttpServletRequest): ClientMetadata {
        val trusted = trustedService(request)
        val ip = if (trusted) {
            header(request, "X-Client-IP", MAX_IP_LENGTH).ifBlank {
                request.remoteAddr
            }
        } else {
            request.remoteAddr
        }

        return ClientMetadata(
            ip = ip,
            userAgent = header(request, "User-Agent", MAX_USER_AGENT_LENGTH),
            os = header(request, "X-Client-OS", MAX_METADATA_LENGTH),
            osVersion = header(request, "X-Client-OS-Version", MAX_METADATA_LENGTH),
            browser = header(request, "X-Client-Browser", MAX_METADATA_LENGTH),
            device = header(request, "X-Client-Device", MAX_METADATA_LENGTH),
            origin = header(request, "X-Client-Origin", MAX_ORIGIN_LENGTH),
            locale = header(request, "Accept-Language", MAX_METADATA_LENGTH),
            region = if (trusted) {
                header(request, "X-Client-Region", MAX_REGION_LENGTH)
            } else {
                ""
            },
        )
    }

    private fun header(request: HttpServletRequest, name: String, limit: Int): String =
        request.getHeader(name).orEmpty().take(limit).replace(Regex("[\r\n]"), "")
}
