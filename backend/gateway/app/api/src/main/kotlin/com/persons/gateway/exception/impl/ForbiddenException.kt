package com.persons.gateway.exception.impl

import com.persons.gateway.domain.ErrorCode
import com.persons.gateway.exception.GatewayException

class ForbiddenException(cause: Throwable? = null) : GatewayException(ErrorCode.FORBIDDEN, cause)
