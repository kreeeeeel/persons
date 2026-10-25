package com.persons.id

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@EnableScheduling
@SpringBootApplication
class IdApplication

fun main(args: Array<String>) {
    runApplication<IdApplication>(*args)
}
