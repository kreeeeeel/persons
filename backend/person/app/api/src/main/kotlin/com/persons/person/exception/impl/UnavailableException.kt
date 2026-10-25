package com.persons.person.exception.impl

import com.persons.person.domain.ErrorCode
import com.persons.person.exception.PersonException

class UnavailableException(code: ErrorCode = ErrorCode.UNAVAILABLE, cause: Throwable? = null) :
    PersonException(code, cause)
