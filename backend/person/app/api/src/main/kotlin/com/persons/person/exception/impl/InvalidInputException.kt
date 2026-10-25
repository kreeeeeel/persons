package com.persons.person.exception.impl

import com.persons.person.domain.ErrorCode
import com.persons.person.exception.PersonException

class InvalidInputException(code: ErrorCode = ErrorCode.INVALID_INPUT, cause: Throwable? = null) :
    PersonException(code, cause)
