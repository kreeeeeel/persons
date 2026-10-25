package com.persons.gateway.exception

import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.gateway.domain.ErrorCode
import com.persons.gateway.exception.impl.ActionRestrictedException
import com.persons.person.contract.dto.ClientErrorResponse
import com.persons.person.contract.dto.RestrictionErrorResponse
import org.slf4j.MDC
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.reactive.function.client.WebClientResponseException
import java.util.concurrent.TimeoutException

private const val REQUEST_ID = "requestId"
private const val UNAVAILABLE = "UNAVAILABLE"
private val ALLOWED_UPSTREAM_CODES = setOf(
    "FORBIDDEN", "UNAUTHORIZED", "USER_NOT_FOUND", "LAST_ADMINISTRATOR", "INVALID_INPUT", UNAVAILABLE,
    "AVATAR_NOT_FOUND",
)

@RestControllerAdvice
class GatewayExceptionHandler(private val mapper: ObjectMapper) {
    @ExceptionHandler(IllegalStateException::class)
    fun timeout(exception: IllegalStateException): ResponseEntity<ClientErrorResponse> {
        if (exception.cause !is TimeoutException) throw exception
        return response(ErrorCode.UNAVAILABLE)
    }

    @ExceptionHandler(GatewayException::class)
    fun application(exception: GatewayException): ResponseEntity<ClientErrorResponse> = response(exception.error)

    @ExceptionHandler(ActionRestrictedException::class)
    fun restricted(exception: ActionRestrictedException): ResponseEntity<RestrictionErrorResponse> =
        ResponseEntity.status(403).body(
            RestrictionErrorResponse(
                RestrictionErrorResponse.Code.ACTION_RESTRICTED, MDC.get(REQUEST_ID).orEmpty(),
                exception.scope, exception.restriction,
            ),
        )

    @ExceptionHandler(WebClientResponseException::class)
    fun upstream(exception: WebClientResponseException): ResponseEntity<ClientErrorResponse> {
        val code = try {
            mapper.readTree(exception.responseBodyAsString)?.get("code")?.asText()
        } catch (invalid: JsonProcessingException) {
            null
        }
        val recognized = code in ALLOWED_UPSTREAM_CODES
        val status = if (recognized) exception.statusCode else HttpStatus.SERVICE_UNAVAILABLE
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON)
            .body(ClientErrorResponse(if (recognized) code.orEmpty() else UNAVAILABLE, MDC.get(REQUEST_ID).orEmpty()))
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
