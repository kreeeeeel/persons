package com.persons.id.domain

data class RegistrationDetails(
    val firstName: String,
    val lastName: String,
    val patronymic: String?,
    val email: String,
    val locale: String,
)
