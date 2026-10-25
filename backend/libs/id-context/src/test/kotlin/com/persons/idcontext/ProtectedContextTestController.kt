package com.persons.idcontext

@RequireUser
class ProtectedContextTestController {
    fun protectedMethod(): String = "protected"
}
