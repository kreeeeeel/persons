package com.persons.restrictions.exception

import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.restrictions.contract.dto.ClientErrorResponse
import com.persons.restrictions.domain.ErrorCode
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.dao.DataAccessException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.reactive.function.client.WebClientResponseException
import java.util.concurrent.TimeoutException

private val logger = LoggerFactory.getLogger(RestrictionsExceptionHandler::class.java)
private const val REQUEST_ID = "requestId"
private val ALLOWED_UPSTREAM_CODES =
    setOf("FORBIDDEN", "UNAUTHORIZED", "USER_NOT_FOUND", "LAST_ADMINISTRATOR", "INVALID_INPUT")

@RestControllerAdvice
class RestrictionsExceptionHandler(private val mapper: ObjectMapper) {
    @ExceptionHandler(WebClientResponseException::class)
    fun upstream(exception: WebClientResponseException): ResponseEntity<ClientErrorResponse> {
        val code = try {
            mapper.readTree(exception.responseBodyAsString)?.get("code")?.asText()
        } catch (invalid: JsonProcessingException) {
            null
        }
        val recognized = code in ALLOWED_UPSTREAM_CODES
        val status = if (recognized) exception.statusCode else HttpStatus.SERVICE_UNAVAILABLE
        return ResponseEntity.status(status)
            .body(
                ClientErrorResponse(
                    if (recognized) code.orEmpty() else ErrorCode.UNAVAILABLE.name, MDC.get(REQUEST_ID).orEmpty(),
                ),
            )
    }

    @ExceptionHandler(IllegalStateException::class)
    fun timeout(exception: IllegalStateException): ResponseEntity<ClientErrorResponse> {
        if (exception.cause !is TimeoutException) throw exception
        return response(ErrorCode.UNAVAILABLE)
    }

    @ExceptionHandler(RestrictionsException::class)
    fun application(exception: RestrictionsException): ResponseEntity<ClientErrorResponse> = response(exception.error)

    @ExceptionHandler(
        DataIntegrityViolationException::class,
        org.springframework.orm.ObjectOptimisticLockingFailureException::class,
    )
    fun conflict(): ResponseEntity<ClientErrorResponse> = response(ErrorCode.CONFLICT)

    @ExceptionHandler(DataAccessException::class)
    fun unavailable(exception: DataAccessException): ResponseEntity<ClientErrorResponse> {
        logger.warn("Restriction database unavailable: {}", exception.javaClass.simpleName)
        return response(ErrorCode.UNAVAILABLE)
    }

    @ExceptionHandler(
        MethodArgumentNotValidException::class,
        org.springframework.http.converter.HttpMessageNotReadableException::class,
        jakarta.validation.ConstraintViolationException::class,
        org.springframework.web.method.annotation.HandlerMethodValidationException::class,
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException::class,
    )
    fun invalid(): ResponseEntity<ClientErrorResponse> = response(ErrorCode.INVALID_INPUT)

    private fun response(code: ErrorCode): ResponseEntity<ClientErrorResponse> = ResponseEntity.status(code.status)
        .body(ClientErrorResponse(code.name, MDC.get(REQUEST_ID).orEmpty()))
}
