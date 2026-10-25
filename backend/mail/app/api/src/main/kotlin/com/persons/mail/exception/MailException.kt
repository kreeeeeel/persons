package com.persons.mail.exception

import org.springframework.http.HttpStatus

abstract class MailException(val status: HttpStatus, val code: String, message: String, cause: Throwable? = null) :
    RuntimeException(message, cause)
