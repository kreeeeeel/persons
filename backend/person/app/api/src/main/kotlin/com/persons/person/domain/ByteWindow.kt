package com.persons.person.domain

data class ByteWindow(val start: Long, val end: Long) {
    val length: Long get() = end - start + 1
}
