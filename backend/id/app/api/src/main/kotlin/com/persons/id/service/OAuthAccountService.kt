package com.persons.id.service

import com.persons.id.domain.Account
import com.persons.id.oauth.OAuthIdentity

interface OAuthAccountService {
    fun resolve(provider: String, identity: OAuthIdentity, locale: String): Account
}
