package com.persons.idcontext

import java.util.UUID

class ContextTestController {
    @RequireUser
    fun protectedMethod(@CurrentUser user: UserPrincipal): UUID = user.userId

    fun publicMethod(): String = "public"
}
