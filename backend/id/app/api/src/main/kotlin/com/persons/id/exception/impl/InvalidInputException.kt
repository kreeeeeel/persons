package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val INVALID_INPUT = "INVALID_INPUT"

class InvalidInputException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.BAD_REQUEST,
        code = INVALID_INPUT,
        message = "The request is invalid",
        cause = cause,
    )
