package com.persons.gateway.exception.impl

import com.persons.gateway.domain.ErrorCode
import com.persons.gateway.exception.GatewayException

class InvalidInputException(cause: Throwable? = null) : GatewayException(ErrorCode.INVALID_INPUT, cause)
