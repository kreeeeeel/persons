package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val UNAVAILABLE = "UNAVAILABLE"

class OperationFailedException(cause: Throwable? = null) :
    IdException(HttpStatus.INTERNAL_SERVER_ERROR, UNAVAILABLE, "The operation could not be completed", cause)
