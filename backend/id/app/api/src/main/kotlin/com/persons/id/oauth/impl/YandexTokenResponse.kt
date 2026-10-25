package com.persons.id.oauth.impl

import com.fasterxml.jackson.annotation.JsonProperty

data class YandexTokenResponse(@JsonProperty("access_token") val accessToken: String)
