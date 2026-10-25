package com.persons.id.service.impl

import com.persons.i18n.client.I18nClient
import com.persons.id.dao.repository.NotificationRepository
import com.persons.id.domain.PreparedNotification
import com.persons.id.exception.impl.MailTranslationsUnavailableException
import com.persons.id.service.NotificationService
import com.persons.mail.client.MailClient
import com.persons.mail.client.generated.model.MailMessage
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.data.domain.PageRequest
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.web.reactive.function.client.WebClientException
import org.thymeleaf.TemplateEngine
import org.thymeleaf.context.Context
import java.time.Instant

private const val FIRST_PAGE_INDEX = 0
private const val SINGLE_ITEM_PAGE_SIZE = 1
private const val TASK_1 = 1
private const val TASK_30 = 30L
private const val REGISTER = "REGISTER"
private const val CHANGE_EMAIL = "CHANGE_EMAIL"

@Service
class NotificationServiceImpl(
    private val translations: I18nClient,
    private val mail: MailClient,
    private val templates: TemplateEngine,
    private val repository: NotificationRepository,
    private val transactions: TransactionTemplate,
) : NotificationService {
    private val logger = LoggerFactory.getLogger(javaClass)

    override fun prepare(email: String, locale: String, code: String, purpose: String): PreparedNotification {
        val catalog = translations.api.getCatalog(locale, "mail").block()

        if (catalog == null) {
            throw MailTranslationsUnavailableException()
        }

        val prefix = when (purpose) {
            REGISTER -> "register"
            CHANGE_EMAIL -> "emailChange"
            else -> "recovery"
        }
        val copy = catalog.messages
        val required =
            listOf("${prefix}Title", "${prefix}Text", "${prefix}Subject", "codeLabel", "expiry", "ignore", "footer")

        if (required.stream().anyMatch { copy[it].isNullOrBlank() }) {
            throw MailTranslationsUnavailableException()
        }

        val context = Context(java.util.Locale.forLanguageTag(locale))

        context.setVariable("copy", copy)
        context.setVariable("title", copy["${prefix}Title"])
        context.setVariable("text", copy["${prefix}Text"])
        context.setVariable("code", code)
        context.setVariable("locale", locale)

        return PreparedNotification(
            email,
            copy["${prefix}Subject"].orEmpty(),
            templates.process("mail/verification", context),
        )
    }

    @Scheduled(fixedDelayString = "\${project.notification.dispatch-delay-ms:2000}")
    override fun dispatch() {
        val task = transactions.execute {
            val next = repository.findDue(Instant.now(), PageRequest.of(FIRST_PAGE_INDEX, SINGLE_ITEM_PAGE_SIZE))
                .stream().findFirst()
                .orElse(null)

            if (next == null) {
                null
            } else {
                next.attempts += TASK_1
                next.nextAttemptAt = Instant.now().plusSeconds(TASK_30)
                repository.save(next)
            }
        }

        if (task == null) {
            return
        }

        val previous = MDC.get("requestId")

        MDC.put("requestId", task.requestId)
        try {
            mail.api.enqueueMail(MailMessage(task.id, task.recipient, task.subject, task.html)).block()
            task.accepted = true
            task.html = ""
            repository.save(task)
        } catch (exception: WebClientException) {
            logger.warn(
                "Mail queue unavailable notificationId={} cause={}",
                task.id,
                exception.javaClass.simpleName,
            )
        } finally {
            if (previous == null) {
                MDC.remove("requestId")
            } else {
                MDC.put("requestId", previous)
            }
        }
    }
}
