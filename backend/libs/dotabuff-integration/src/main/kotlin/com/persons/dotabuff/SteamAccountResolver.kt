package com.persons.dotabuff

interface SteamAccountResolver {
    fun resolve(profileUrl: String): Long
}
