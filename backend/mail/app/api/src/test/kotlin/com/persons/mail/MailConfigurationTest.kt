package com.persons.mail

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.boot.autoconfigure.AutoConfigurations
import org.springframework.boot.autoconfigure.mail.MailSenderAutoConfiguration
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer
import org.springframework.boot.test.context.runner.ApplicationContextRunner
import org.springframework.mail.javamail.JavaMailSenderImpl

private const val IS_EQUAL_TO_587 = 587
private const val IS_EQUAL_TO_1025 = 1025

class MailConfigurationTest {
    private val contextRunner = ApplicationContextRunner()
        .withInitializer(ConfigDataApplicationContextInitializer())
        .withConfiguration(AutoConfigurations.of(MailSenderAutoConfiguration::class.java))
        .withPropertyValues("spring.config.location=classpath:/config/", "spring.profiles.active=dev")

    @Test
    fun `dev profile accepts Gmail settings and requires encrypted authenticated SMTP`() {
        contextRunner.withPropertyValues(
            "SMTP_HOST=smtp.gmail.com",
            "SMTP_PORT=587",
            "SMTP_USER=test-sender@gmail.com",
            "SMTP_PASSWORD=test-only-app-password",
            "SMTP_AUTH=true",
            "SMTP_STARTTLS=true",
        ).run { context ->
            assertThat(context).hasNotFailed()

            val sender = context.getBean(JavaMailSenderImpl::class.java)

            assertThat(sender.host).isEqualTo("smtp.gmail.com")
            assertThat(sender.port).isEqualTo(IS_EQUAL_TO_587)
            assertThat(sender.username).isEqualTo("test-sender@gmail.com")
            assertThat(sender.javaMailProperties.getProperty("mail.smtp.auth")).isEqualTo("true")
            assertThat(sender.javaMailProperties.getProperty("mail.smtp.starttls.enable")).isEqualTo("true")
            assertThat(sender.javaMailProperties.getProperty("mail.smtp.starttls.required")).isEqualTo("true")
        }
    }

    @Test
    fun `dev profile retains the local SMTP defaults when no provider is configured`() {
        contextRunner.run { context ->
            assertThat(context).hasNotFailed()

            val sender = context.getBean(JavaMailSenderImpl::class.java)

            assertThat(sender.host).isEqualTo("localhost")
            assertThat(sender.port).isEqualTo(IS_EQUAL_TO_1025)
            assertThat(sender.javaMailProperties.getProperty("mail.smtp.auth")).isEqualTo("false")
            assertThat(sender.javaMailProperties.getProperty("mail.smtp.starttls.enable")).isEqualTo("false")
            assertThat(sender.javaMailProperties.getProperty("mail.smtp.starttls.required")).isEqualTo("false")
        }
    }
}
