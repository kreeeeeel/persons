package com.persons.mail.domain

import java.util.UUID

data class OutgoingMail(val id: UUID, val recipient: String, val subject: String, val html: String)
