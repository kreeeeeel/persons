package com.persons.idcontext

fun interface SessionVerifier {
    fun verify(token: String): UserPrincipal
}
