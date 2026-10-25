package com.persons.i18n.exception

import org.springframework.http.HttpStatus

abstract class I18nException(val status: HttpStatus, val code: String, message: String, cause: Throwable? = null) :
    RuntimeException(message, cause)
