package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val INVALID_CODE = "INVALID_CODE"

class InvalidCodeException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.BAD_REQUEST,
        code = INVALID_CODE,
        message = "The verification code is invalid",
        cause = cause,
    )
