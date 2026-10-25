package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val CODE = "USER_NOT_FOUND"

class UserNotFoundException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.NOT_FOUND,
        code = CODE,
        message = "Account was not found",
        cause = cause,
    )
