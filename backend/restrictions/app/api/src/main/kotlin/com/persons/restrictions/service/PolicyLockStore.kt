package com.persons.restrictions.service

interface PolicyLockStore {
    fun initialize()
    fun exists(): Boolean
}
