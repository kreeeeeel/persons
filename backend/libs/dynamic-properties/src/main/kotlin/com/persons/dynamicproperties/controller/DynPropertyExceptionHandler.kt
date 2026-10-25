package com.persons.dynamicproperties.controller

import com.persons.dynamicproperties.exception.DynPropertyException
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
class DynPropertyExceptionHandler {
    @ExceptionHandler(DynPropertyException::class)
    fun handle(exception: DynPropertyException): ResponseEntity<Map<String, String>> {
        val status =
            when (exception.code) {
                "CONFLICT" -> 409
                "UNAUTHORIZED" -> 401
                "FORBIDDEN" -> 403
                "UNAVAILABLE" -> 503
                else -> 400
            }
        return ResponseEntity.status(status).body(mapOf("code" to if (status == 400) "INVALID_INPUT" else exception.code))
    }
}
