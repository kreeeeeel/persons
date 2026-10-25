package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val TOO_MANY_ATTEMPTS = "TOO_MANY_ATTEMPTS"

class TooManyAttemptsException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.TOO_MANY_REQUESTS,
        code = TOO_MANY_ATTEMPTS,
        message = "Too many attempts",
        cause = cause,
    )
