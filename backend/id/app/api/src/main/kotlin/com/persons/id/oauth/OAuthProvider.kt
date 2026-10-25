package com.persons.id.oauth

interface OAuthProvider {
    val id: String
    fun authorizationUrl(state: String, verifier: String): String
    fun identify(code: String, verifier: String): OAuthIdentity
}
