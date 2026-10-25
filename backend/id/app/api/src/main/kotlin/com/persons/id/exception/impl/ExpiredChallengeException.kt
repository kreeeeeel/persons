package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val EXPIRED_CHALLENGE = "EXPIRED_CHALLENGE"

class ExpiredChallengeException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.BAD_REQUEST,
        code = EXPIRED_CHALLENGE,
        message = "The verification challenge has expired",
        cause = cause,
    )
