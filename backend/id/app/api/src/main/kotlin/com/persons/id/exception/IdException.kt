package com.persons.id.exception

import org.springframework.http.HttpStatus

abstract class IdException(val status: HttpStatus, val code: String, message: String, cause: Throwable? = null) :
    RuntimeException(message, cause)
