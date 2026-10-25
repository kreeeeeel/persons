package com.persons.i18n.exception.impl

import com.persons.i18n.exception.I18nException
import org.springframework.http.HttpStatus

private const val UNAUTHORIZED = "UNAUTHORIZED"

class UnauthorizedException :
    I18nException(status = HttpStatus.UNAUTHORIZED, code = UNAUTHORIZED, message = "Service authentication is required")
