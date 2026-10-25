package com.persons.mail.exception.impl

import com.persons.mail.exception.MailException
import org.springframework.http.HttpStatus

private const val INVALID_INPUT = "INVALID_INPUT"

class InvalidMailRequestException :
    MailException(status = HttpStatus.BAD_REQUEST, code = INVALID_INPUT, message = "The mail request is invalid")
