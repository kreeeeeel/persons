package com.persons.person.exception.impl

import com.persons.person.domain.ErrorCode
import com.persons.person.exception.PersonException

class MediaException(code: ErrorCode = ErrorCode.UNSUPPORTED_MEDIA, cause: Throwable? = null) :
    PersonException(code, cause)
