package com.persons.idcontext

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus

@ResponseStatus(HttpStatus.UNAUTHORIZED)
class SessionRequiredException : RuntimeException("Session required")
