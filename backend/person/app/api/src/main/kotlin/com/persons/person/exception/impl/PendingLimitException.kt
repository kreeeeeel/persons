package com.persons.person.exception.impl

import com.persons.person.domain.ErrorCode
import com.persons.person.exception.PersonException

class PendingLimitException(code: ErrorCode = ErrorCode.TOO_MANY_PENDING, cause: Throwable? = null) :
    PersonException(code, cause)
