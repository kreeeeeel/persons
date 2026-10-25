package com.persons.gateway.exception.impl

import com.persons.gateway.domain.ErrorCode
import com.persons.gateway.exception.GatewayException

class UnauthorizedException(cause: Throwable? = null) : GatewayException(ErrorCode.UNAUTHORIZED, cause)
