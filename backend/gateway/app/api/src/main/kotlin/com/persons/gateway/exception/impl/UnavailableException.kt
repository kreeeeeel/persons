package com.persons.gateway.exception.impl

import com.persons.gateway.domain.ErrorCode
import com.persons.gateway.exception.GatewayException

class UnavailableException(cause: Throwable? = null) : GatewayException(ErrorCode.UNAVAILABLE, cause)
