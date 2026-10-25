package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val INVALID_CREDENTIALS = "INVALID_CREDENTIALS"

class InvalidCredentialsException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.UNAUTHORIZED,
        code = INVALID_CREDENTIALS,
        message = "The credentials are invalid",
        cause = cause,
    )
