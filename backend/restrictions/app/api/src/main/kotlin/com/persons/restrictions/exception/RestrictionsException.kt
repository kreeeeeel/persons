package com.persons.restrictions.exception

import com.persons.restrictions.domain.ErrorCode

abstract class RestrictionsException(val error: ErrorCode, cause: Throwable? = null) :
    RuntimeException(error.name, cause)
