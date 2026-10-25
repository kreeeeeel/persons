package com.persons.id.component

import com.persons.id.exception.impl.InvalidInputException
import org.springframework.stereotype.Component

private const val MIN_PASSWORD_LENGTH = 10
private const val MAX_PASSWORD_BYTES = 72

@Component
class PasswordPolicy {
    fun validate(password: String) {
        if (password.length < MIN_PASSWORD_LENGTH || password.toByteArray().size > MAX_PASSWORD_BYTES) {
            throw InvalidInputException()
        }
    }
}
