package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val RESEND_TOO_EARLY = "RESEND_TOO_EARLY"

class ResendTooEarlyException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.TOO_MANY_REQUESTS,
        code = RESEND_TOO_EARLY,
        message = "The verification code cannot be resent yet",
        cause = cause,
    )
