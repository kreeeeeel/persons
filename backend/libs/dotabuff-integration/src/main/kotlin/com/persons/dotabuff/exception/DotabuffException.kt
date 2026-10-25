package com.persons.dotabuff.exception

import java.time.Duration

class DotabuffException(
    val code: String,
    val retryAfter: Duration? = null,
    cause: Throwable? = null,
) : RuntimeException("DotaBuff integration failed: $code", cause)
