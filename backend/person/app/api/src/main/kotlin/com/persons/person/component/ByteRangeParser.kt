package com.persons.person.component

import com.persons.person.domain.ByteWindow
import com.persons.person.exception.impl.InvalidRangeException
import org.springframework.stereotype.Component

private val RANGE_PATTERN = Regex("^bytes=([0-9]*)-([0-9]*)$")

@Component
class ByteRangeParser {
    fun parse(value: String?, size: Long): ByteWindow? {
        if (value == null) {
            return null
        }

        val match = RANGE_PATTERN.matchEntire(value) ?: throw InvalidRangeException(size)
        val from = match.groupValues[1]
        val to = match.groupValues[2]

        if (size <= 0 || (from.isEmpty() && to.isEmpty())) {
            throw InvalidRangeException(size)
        }

        if (from.isEmpty()) {
            val suffix = to.toLongOrNull() ?: throw InvalidRangeException(size)

            if (suffix <= 0) {
                throw InvalidRangeException(size)
            }

            return ByteWindow(maxOf(0, size - suffix), size - 1)
        }

        val start = from.toLongOrNull() ?: throw InvalidRangeException(size)
        val end = if (to.isEmpty()) size - 1 else to.toLongOrNull() ?: throw InvalidRangeException(size)

        if (start >= size || start > end) {
            throw InvalidRangeException(size)
        }

        return ByteWindow(start, minOf(end, size - 1))
    }
}
