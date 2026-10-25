package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val AVATAR_NOT_FOUND = "AVATAR_NOT_FOUND"

class AvatarNotFoundException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.NOT_FOUND,
        code = AVATAR_NOT_FOUND,
        message = "The avatar was not found",
        cause = cause,
    )
