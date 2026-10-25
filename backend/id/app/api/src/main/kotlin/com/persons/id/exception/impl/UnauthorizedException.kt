package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val UNAUTHORIZED = "UNAUTHORIZED"

class UnauthorizedException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.UNAUTHORIZED,
        code = UNAUTHORIZED,
        message = "An authenticated session is required",
        cause = cause,
    )
