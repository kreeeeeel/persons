package com.persons.person.exception

import com.persons.person.contract.dto.ClientErrorResponse
import com.persons.person.domain.ErrorCode
import com.persons.person.exception.impl.InvalidRangeException
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

private const val REQUEST_ID = "requestId"
private val logger = LoggerFactory.getLogger(PersonExceptionHandler::class.java)

@RestControllerAdvice
class PersonExceptionHandler {
    @ExceptionHandler(InvalidRangeException::class)
    fun range(exception: InvalidRangeException): ResponseEntity<ClientErrorResponse> =
        ResponseEntity.status(exception.error.status).header("Content-Range", "bytes */${exception.size}")
            .body(ClientErrorResponse(exception.error.name, MDC.get(REQUEST_ID).orEmpty()))

    @ExceptionHandler(PersonException::class)
    fun application(exception: PersonException): ResponseEntity<ClientErrorResponse> = response(exception.error)

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun conflict(exception: DataIntegrityViolationException): ResponseEntity<ClientErrorResponse> {
        logger.warn("Person database constraint rejected a change: {}", exception.javaClass.simpleName)

        return response(ErrorCode.CONFLICT)
    }

    @ExceptionHandler(
        MethodArgumentNotValidException::class,
        org.springframework.http.converter.HttpMessageNotReadableException::class,
        jakarta.validation.ConstraintViolationException::class,
        org.springframework.web.method.annotation.HandlerMethodValidationException::class,
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException::class,
    )
    fun invalid(): ResponseEntity<ClientErrorResponse> = response(ErrorCode.INVALID_INPUT)

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException::class)
    fun oversized(): ResponseEntity<ClientErrorResponse> = response(ErrorCode.UPLOAD_TOO_LARGE)

    private fun response(code: ErrorCode): ResponseEntity<ClientErrorResponse> = ResponseEntity.status(code.status)
        .contentType(MediaType.APPLICATION_JSON)
        .body(ClientErrorResponse(code.name, MDC.get(REQUEST_ID).orEmpty()))
}
