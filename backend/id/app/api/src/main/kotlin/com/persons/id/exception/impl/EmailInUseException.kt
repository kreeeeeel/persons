package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val EMAIL_IN_USE = "EMAIL_IN_USE"

class EmailInUseException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.CONFLICT,
        code = EMAIL_IN_USE,
        message = "The email address is already registered",
        cause = cause,
    )
