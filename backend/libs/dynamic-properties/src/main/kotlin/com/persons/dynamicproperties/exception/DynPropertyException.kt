package com.persons.dynamicproperties.exception

class DynPropertyException(
    val code: String,
    cause: Throwable? = null,
) : RuntimeException("Dynamic property operation failed: $code", cause)
