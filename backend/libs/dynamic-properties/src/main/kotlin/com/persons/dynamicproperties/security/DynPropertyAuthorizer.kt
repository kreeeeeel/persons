package com.persons.dynamicproperties.security

interface DynPropertyAuthorizer {
    fun administrator(): String

    fun service(): String
}
