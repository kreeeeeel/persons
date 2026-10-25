package com.persons.gateway.exception

import com.persons.gateway.domain.ErrorCode

abstract class GatewayException(val error: ErrorCode, cause: Throwable? = null) : RuntimeException(error.name, cause)
