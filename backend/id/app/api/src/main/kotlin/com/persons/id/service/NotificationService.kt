package com.persons.id.service

import com.persons.id.domain.PreparedNotification

interface NotificationService {
    fun prepare(email: String, locale: String, code: String, purpose: String): PreparedNotification
    fun dispatch()
}
