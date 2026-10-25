package com.persons.person.exception

import com.persons.person.domain.ErrorCode

abstract class PersonException(val error: ErrorCode, cause: Throwable? = null) : RuntimeException(error.name, cause)
