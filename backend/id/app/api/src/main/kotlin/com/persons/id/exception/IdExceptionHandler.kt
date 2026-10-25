package com.persons.id.exception

import com.persons.id.contract.dto.ClientErrorResponse
import com.persons.idcontext.SessionRequiredException
import org.slf4j.MDC
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.reactive.function.client.WebClientException

private const val INVALID_INPUT = "INVALID_INPUT"
private const val UNAUTHORIZED = "UNAUTHORIZED"
private const val EMAIL_IN_USE = "EMAIL_IN_USE"
private const val UNAVAILABLE = "UNAVAILABLE"

@RestControllerAdvice
class IdExceptionHandler {
    @ExceptionHandler(IdException::class)
    fun handle(exception: IdException): ResponseEntity<ClientErrorResponse> =
        ResponseEntity.status(exception.status).contentType(MediaType.APPLICATION_JSON).body(response(exception.code))

    @ExceptionHandler(
        MethodArgumentNotValidException::class,
        HttpMessageNotReadableException::class,
        jakarta.validation.ConstraintViolationException::class,
        org.springframework.web.method.annotation.HandlerMethodValidationException::class,
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException::class,
    )
    fun invalidInput(): ResponseEntity<ClientErrorResponse> =
        ResponseEntity.badRequest().contentType(MediaType.APPLICATION_JSON).body(response(INVALID_INPUT))

    @ExceptionHandler(SessionRequiredException::class)
    fun unauthorized(): ResponseEntity<ClientErrorResponse> = ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .contentType(MediaType.APPLICATION_JSON)
        .body(response(UNAUTHORIZED))

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun conflict(): ResponseEntity<ClientErrorResponse> =
        ResponseEntity.status(HttpStatus.CONFLICT).contentType(MediaType.APPLICATION_JSON).body(response(EMAIL_IN_USE))

    @ExceptionHandler(WebClientException::class)
    fun unavailable(): ResponseEntity<ClientErrorResponse> =
        ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).contentType(MediaType.APPLICATION_JSON)
            .body(response(UNAVAILABLE))

    private fun response(code: String): ClientErrorResponse = ClientErrorResponse(code, MDC.get("requestId").orEmpty())
}
