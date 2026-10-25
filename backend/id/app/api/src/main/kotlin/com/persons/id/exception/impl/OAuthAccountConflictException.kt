package com.persons.id.exception.impl

import com.persons.id.exception.IdException
import org.springframework.http.HttpStatus

private const val CODE = "OAUTH_ACCOUNT_CONFLICT"

class OAuthAccountConflictException(cause: Throwable? = null) :
    IdException(
        status = HttpStatus.CONFLICT,
        code = CODE,
        message = "Sign in with the existing account before linking a provider",
        cause = cause,
    )
