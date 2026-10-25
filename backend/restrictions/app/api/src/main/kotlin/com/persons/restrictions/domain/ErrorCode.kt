package com.persons.restrictions.domain

import org.springframework.http.HttpStatus

enum class ErrorCode(val status: HttpStatus) {
    INVALID_INPUT(HttpStatus.BAD_REQUEST),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED),
    FORBIDDEN(HttpStatus.FORBIDDEN),
    CONFLICT(HttpStatus.CONFLICT),
    UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE),
}
