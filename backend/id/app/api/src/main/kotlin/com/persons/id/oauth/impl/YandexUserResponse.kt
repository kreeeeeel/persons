package com.persons.id.oauth.impl

import com.fasterxml.jackson.annotation.JsonProperty

data class YandexUserResponse(
    val id: String,
    @JsonProperty("default_email") val email: String? = null,
    @JsonProperty("first_name") val firstName: String = "",
    @JsonProperty("last_name") val lastName: String = "",
)
