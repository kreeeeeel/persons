package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val CODE = "FORBIDDEN"

class ForbiddenException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.FORBIDDEN,
        code = CODE,
        message = "Administrator access is required",
        cause = cause,
    )
