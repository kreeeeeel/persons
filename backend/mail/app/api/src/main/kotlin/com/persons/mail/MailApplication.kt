package com.persons.mail

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@EnableScheduling
@SpringBootApplication
class MailApplication

fun main(args: Array<String>) {
    runApplication<MailApplication>(*args)
}
