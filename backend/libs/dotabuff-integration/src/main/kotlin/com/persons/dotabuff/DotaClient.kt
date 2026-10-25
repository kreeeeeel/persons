package com.persons.dotabuff

import com.persons.dotabuff.domain.DotaMatchPage
import com.persons.dotabuff.domain.DotaMatchReference
import com.persons.dotabuff.domain.DotaPlayerMatch

interface DotaClient {
    fun matches(
        accountId: Long,
        page: Int,
    ): DotaMatchPage

    fun match(
        accountId: Long,
        reference: DotaMatchReference,
    ): DotaPlayerMatch
}
