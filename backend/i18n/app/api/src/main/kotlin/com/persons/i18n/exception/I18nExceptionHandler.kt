package com.persons.i18n.exception

import com.persons.i18n.contract.dto.ClientErrorResponse
import org.slf4j.MDC
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.orm.ObjectOptimisticLockingFailureException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

private const val HTTP_CONFLICT = 409
private const val INVALID_INPUT = "INVALID_INPUT"
private const val CONCURRENT_UPDATE = "CONCURRENT_UPDATE"

@RestControllerAdvice
class I18nExceptionHandler {
    @ExceptionHandler(I18nException::class)
    fun handle(exception: I18nException): ResponseEntity<ClientErrorResponse> =
        ResponseEntity.status(exception.status).body(response(exception.code))

    @ExceptionHandler(MethodArgumentNotValidException::class, HttpMessageNotReadableException::class)
    fun invalidInput(): ResponseEntity<ClientErrorResponse> = ResponseEntity.badRequest().body(response(INVALID_INPUT))

    @ExceptionHandler(DataIntegrityViolationException::class, ObjectOptimisticLockingFailureException::class)
    fun conflict(): ResponseEntity<ClientErrorResponse> =
        ResponseEntity.status(HTTP_CONFLICT).body(response(CONCURRENT_UPDATE))

    private fun response(code: String): ClientErrorResponse = ClientErrorResponse(code, MDC.get("requestId").orEmpty())
}
