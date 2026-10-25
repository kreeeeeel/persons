package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val UNAVAILABLE = "UNAVAILABLE"

class MailTranslationsUnavailableException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.SERVICE_UNAVAILABLE,
        code = UNAVAILABLE,
        message = "Mail translations are unavailable",
        cause = cause,
    )
