package com.persons.mail.service.impl

import com.persons.mail.dao.entity.MailEntity
import com.persons.mail.dao.repository.MailRepository
import com.persons.mail.domain.OutgoingMail
import com.persons.mail.service.MailService
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.domain.PageRequest
import org.springframework.mail.MailException
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate
import java.time.Instant

private const val FIRST_PAGE_INDEX = 0
private const val SINGLE_ITEM_PAGE_SIZE = 1
private const val MESSAGE_1 = 1
private const val MESSAGE_60 = 60L
private const val SENT = "SENT"
private const val FAILED = "FAILED"

@Service
class MailServiceImpl(
    private val repository: MailRepository,
    private val sender: JavaMailSender,
    private val transactions: TransactionTemplate,
    @Value("\${project.mail.from}") private val from: String,
    @Value("\${project.mail.max-attempts:5}") private val maxAttempts: Int,
) : MailService {
    private val logger = LoggerFactory.getLogger(javaClass)

    override fun enqueue(mail: OutgoingMail): String {
        val existing = repository.findById(mail.id).orElse(null)

        if (existing != null) {
            return existing.status
        }

        return try {
            repository.saveAndFlush(MailEntity(mail.id, mail.recipient, mail.subject, mail.html)).status
        } catch (exception: DataIntegrityViolationException) {
            val result = repository.findById(mail.id).orElse(null)?.status

            if (result == null) {
                throw exception
            }

            result
        }
    }

    @Scheduled(fixedDelayString = "\${project.mail.dispatch-delay-ms:2000}")
    override fun dispatch() {
        val message = transactions.execute {
            val next = repository.findDue(Instant.now(), PageRequest.of(FIRST_PAGE_INDEX, SINGLE_ITEM_PAGE_SIZE))
                .stream().findFirst()
                .orElse(null)

            if (next != null) {
                next.attempts += MESSAGE_1
                next.nextAttemptAt = Instant.now().plusSeconds(MESSAGE_60)
                repository.save(next)
            } else {
                null
            }
        }

        if (message == null) {
            return
        }

        try {
            val mime = sender.createMimeMessage()
            val helper = MimeMessageHelper(mime, "UTF-8")

            helper.setFrom(from)
            helper.setTo(message.recipient)
            helper.setSubject(message.subject)
            helper.setText(message.html, true)
            mime.setHeader("X-Persons-Message-ID", message.id.toString())
            sender.send(mime)
            message.status = SENT
            message.html = ""
        } catch (exception: MailException) {
            logger.warn(
                "SMTP delivery failed messageId={} attempt={} cause={}",
                message.id,
                message.attempts,
                exception.javaClass.simpleName,
            )

            if (message.attempts >= maxAttempts) {
                message.status = FAILED
                message.html = ""
            }
        }
        repository.save(message)
    }
}
