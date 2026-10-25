package com.persons.restrictions.exception.impl

import com.persons.restrictions.domain.ErrorCode
import com.persons.restrictions.exception.RestrictionsException

class ForbiddenException(cause: Throwable? = null) : RestrictionsException(ErrorCode.FORBIDDEN, cause)
