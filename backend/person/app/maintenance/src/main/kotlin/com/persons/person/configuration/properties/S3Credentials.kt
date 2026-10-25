package com.persons.person.configuration.properties

import jakarta.validation.constraints.NotBlank

class S3Credentials(
    @field:NotBlank
    val accessKey: String,
    @field:NotBlank
    val secretKey: String,
)
