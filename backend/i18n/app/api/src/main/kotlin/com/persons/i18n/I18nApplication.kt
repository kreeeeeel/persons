package com.persons.i18n

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@EnableScheduling
@SpringBootApplication
class I18nApplication

fun main(args: Array<String>) {
    runApplication<I18nApplication>(*args)
}
