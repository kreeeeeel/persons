package com.persons.requestobservability

import jakarta.servlet.ServletOutputStream
import jakarta.servlet.WriteListener
import java.io.ByteArrayOutputStream

private const val REMAINING_LIMIT = 0

class CapturingOutputStream(
    private val delegate: ServletOutputStream,
    private val capture: ByteArrayOutputStream,
    private val limit: Int,
) : ServletOutputStream() {
    override fun write(value: Int) {
        if (capture.size() < limit) {
            capture.write(value)
        }

        delegate.write(value)
    }

    override fun write(bytes: ByteArray, offset: Int, length: Int) {
        val remaining = limit - capture.size()

        if (remaining > REMAINING_LIMIT) {
            capture.write(bytes, offset, minOf(length, remaining))
        }

        delegate.write(bytes, offset, length)
    }

    override fun flush() = delegate.flush()

    override fun close() = delegate.close()

    override fun isReady(): Boolean = delegate.isReady

    override fun setWriteListener(listener: WriteListener) = delegate.setWriteListener(listener)
}
