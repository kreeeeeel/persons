package com.persons.restrictions.exception.impl

import com.persons.restrictions.domain.ErrorCode
import com.persons.restrictions.exception.RestrictionsException

class InvalidInputException(cause: Throwable? = null) : RestrictionsException(ErrorCode.INVALID_INPUT, cause)
