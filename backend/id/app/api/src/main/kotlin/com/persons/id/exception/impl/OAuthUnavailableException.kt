package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val CODE = "OAUTH_UNAVAILABLE"

class OAuthUnavailableException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.SERVICE_UNAVAILABLE,
        code = CODE,
        message = "Identity provider is temporarily unavailable",
        cause = cause,
    )
