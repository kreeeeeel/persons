package com.persons.mail.service

import com.persons.mail.domain.OutgoingMail

interface MailService {
    fun enqueue(mail: OutgoingMail): String
    fun dispatch()
}
