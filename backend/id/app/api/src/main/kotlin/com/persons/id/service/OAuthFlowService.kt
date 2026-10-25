package com.persons.id.service

import com.persons.id.dao.entity.OAuthFlowEntity

interface OAuthFlowService {
    fun begin(provider: String, binding: String, locale: String): Pair<String, String>
    fun consume(provider: String, state: String, binding: String): OAuthFlowEntity
}
