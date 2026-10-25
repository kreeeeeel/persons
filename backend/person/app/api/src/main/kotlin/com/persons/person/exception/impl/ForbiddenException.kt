package com.persons.person.exception.impl

import com.persons.person.domain.ErrorCode
import com.persons.person.exception.PersonException

class ForbiddenException(code: ErrorCode = ErrorCode.FORBIDDEN, cause: Throwable? = null) : PersonException(code, cause)
