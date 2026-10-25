package com.persons.leetify.exception

import java.time.Duration

class LeetifyException(
    val code: String,
    val retryAfter: Duration? = null,
    cause: Throwable? = null,
) : RuntimeException("Leetify request failed: $code", cause)
