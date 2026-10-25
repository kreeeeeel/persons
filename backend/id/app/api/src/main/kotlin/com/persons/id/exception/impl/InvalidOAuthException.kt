package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val CODE = "INVALID_OAUTH"

class InvalidOAuthException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.UNAUTHORIZED,
        code = CODE,
        message = "The sign-in attempt has expired or is invalid",
        cause = cause,
    )
