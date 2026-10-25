package com.persons.mail.exception

import com.persons.mail.contract.dto.ClientErrorResponse
import com.persons.mail.exception.impl.InvalidMailRequestException
import org.slf4j.MDC
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class MailExceptionHandler {
    @ExceptionHandler(MailException::class)
    fun handle(exception: MailException): ResponseEntity<ClientErrorResponse> =
        ResponseEntity.status(exception.status).body(response(exception.code))

    @ExceptionHandler(MethodArgumentNotValidException::class, HttpMessageNotReadableException::class)
    fun invalidInput(): ResponseEntity<ClientErrorResponse> = handle(InvalidMailRequestException())

    private fun response(code: String): ClientErrorResponse = ClientErrorResponse(code, MDC.get("requestId").orEmpty())
}
