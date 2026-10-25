package com.persons.dotabuff.domain

data class DotaItem(
    val key: String,
    val name: String,
    val slot: Int,
    val acquiredAtSeconds: Int? = null,
)
