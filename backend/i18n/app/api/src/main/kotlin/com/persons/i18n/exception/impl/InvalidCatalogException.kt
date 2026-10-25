package com.persons.i18n.exception.impl

import com.persons.i18n.exception.I18nException
import org.springframework.http.HttpStatus

private const val INVALID_INPUT = "INVALID_INPUT"

class InvalidCatalogException :
    I18nException(status = HttpStatus.BAD_REQUEST, code = INVALID_INPUT, message = "The translation catalog is invalid")
