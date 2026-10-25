package com.persons.requestobservability

data class ClientMetadata(
    val ip: String,
    val userAgent: String,
    val os: String,
    val osVersion: String,
    val browser: String,
    val device: String,
    val origin: String,
    val locale: String,
    val region: String = "",
)
