package com.persons.person.exception.impl

import com.persons.person.domain.ErrorCode
import com.persons.person.exception.PersonException

class InvalidRangeException(val size: Long) : PersonException(ErrorCode.RANGE_NOT_SATISFIABLE)
