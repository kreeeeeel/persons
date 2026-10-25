package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val INVALID_AVATAR = "INVALID_AVATAR"

class InvalidAvatarException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.BAD_REQUEST,
        code = INVALID_AVATAR,
        message = "The avatar is invalid",
        cause = cause,
    )
