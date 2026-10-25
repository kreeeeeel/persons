package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val CODE = "LAST_ADMINISTRATOR"

class LastAdministratorException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.CONFLICT,
        code = CODE,
        message = "The last active administrator cannot be removed",
        cause = cause,
    )
