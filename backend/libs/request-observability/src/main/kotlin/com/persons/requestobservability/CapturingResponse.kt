package com.persons.requestobservability

import jakarta.servlet.ServletOutputStream
import jakarta.servlet.http.HttpServletResponse
import jakarta.servlet.http.HttpServletResponseWrapper
import java.io.ByteArrayOutputStream
import java.io.OutputStreamWriter
import java.io.PrintWriter

private const val STREAM = 1

class CapturingResponse(response: HttpServletResponse, limit: Int) : HttpServletResponseWrapper(response) {
    private val capture = ByteArrayOutputStream()
    private val stream = CapturingOutputStream(response.outputStream, capture, limit + STREAM)
    private var textWriter: PrintWriter? = null

    override fun getOutputStream(): ServletOutputStream = stream

    override fun getWriter(): PrintWriter {
        val existing = textWriter

        if (existing != null) {
            return existing
        }

        val created = PrintWriter(OutputStreamWriter(stream, characterEncoding))

        textWriter = created

        return created
    }

    override fun flushBuffer() {
        textWriter?.flush()
        super.flushBuffer()
    }

    fun capturedBody(): ByteArray {
        textWriter?.flush()

        return capture.toByteArray()
    }
}
