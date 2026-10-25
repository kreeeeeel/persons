package com.persons.mail.controller

import com.persons.mail.contract.api.InternalApi
import com.persons.mail.contract.dto.DeliveryStatus
import com.persons.mail.contract.dto.MailMessage
import com.persons.mail.contract.dto.MailReceipt
import com.persons.mail.domain.OutgoingMail
import com.persons.mail.service.MailService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class MailController(private val service: MailService) : InternalApi {
    override fun enqueueMail(mailMessage: MailMessage): ResponseEntity<MailReceipt> {
        val status = service.enqueue(
            OutgoingMail(mailMessage.id, mailMessage.recipient, mailMessage.subject, mailMessage.html),
        )

        return ResponseEntity.accepted().body(MailReceipt(mailMessage.id, DeliveryStatus.valueOf(status)))
    }
}
