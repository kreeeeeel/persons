package com.persons.restrictions.exception.impl

import com.persons.restrictions.domain.ErrorCode
import com.persons.restrictions.exception.RestrictionsException

class UnauthorizedException(cause: Throwable? = null) : RestrictionsException(ErrorCode.UNAUTHORIZED, cause)
