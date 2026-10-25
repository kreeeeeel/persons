package com.persons.person.exception.impl

import com.persons.person.domain.ErrorCode
import com.persons.person.exception.PersonException

class NotFoundException(code: ErrorCode = ErrorCode.PERSON_NOT_FOUND, cause: Throwable? = null) :
    PersonException(code, cause)
