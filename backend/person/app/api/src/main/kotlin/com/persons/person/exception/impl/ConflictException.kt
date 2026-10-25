package com.persons.person.exception.impl

import com.persons.person.domain.ErrorCode
import com.persons.person.exception.PersonException

class ConflictException(code: ErrorCode = ErrorCode.CONFLICT, cause: Throwable? = null) : PersonException(code, cause)
