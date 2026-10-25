package com.persons.person.exception.impl

import com.persons.person.domain.ErrorCode
import com.persons.person.exception.PersonException

class UnauthorizedException(code: ErrorCode = ErrorCode.UNAUTHORIZED, cause: Throwable? = null) :
    PersonException(code, cause)
