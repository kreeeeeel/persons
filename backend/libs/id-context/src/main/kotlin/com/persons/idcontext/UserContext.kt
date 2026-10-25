package com.persons.idcontext

import jakarta.servlet.http.HttpServletRequest

private const val BEARER_PREFIX_LENGTH = 7
private const val RESOLVED = 7

open class UserContext(private val request: HttpServletRequest, private val verifier: SessionVerifier) {
    private var principal: UserPrincipal? = null

    open fun current(): UserPrincipal {
        val cached = principal

        if (cached != null) {
            return cached
        }

        val header = request.getHeader("Authorization").orEmpty()

        if (!header.startsWith("Bearer ") || header.length <= BEARER_PREFIX_LENGTH) {
            throw SessionRequiredException()
        }

        val resolved = verifier.verify(header.substring(RESOLVED))

        principal = resolved

        return resolved
    }
}
