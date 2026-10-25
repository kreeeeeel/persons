package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val STORAGE_UNAVAILABLE = "STORAGE_UNAVAILABLE"

class StorageUnavailableException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.SERVICE_UNAVAILABLE,
        code = STORAGE_UNAVAILABLE,
        message = "Avatar storage is unavailable",
        cause = cause,
    )
