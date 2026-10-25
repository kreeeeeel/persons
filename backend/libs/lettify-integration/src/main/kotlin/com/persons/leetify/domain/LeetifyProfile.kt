package com.persons.leetify.domain

data class LeetifyProfile(
    val steam64Id: String,
    val recentMatches: List<LeetifyMatchReference>,
)
