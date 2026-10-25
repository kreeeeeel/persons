plugins {
    kotlin("jvm")
    kotlin("plugin.spring")
    kotlin("plugin.jpa")
    `java-library`
}
dependencies {
    api("com.persons.dotabuff:dotabuff-integration:0.1.0")
    api("com.persons.leetify:lettify-integration:0.1.0")
    api("org.springframework.boot:spring-boot-starter-data-jpa")
    api("org.springframework.boot:spring-boot-starter-validation")
    api("software.amazon.awssdk:s3:2.55.12") {
        exclude(group = "software.amazon.awssdk", module = "apache-client")
        exclude(group = "software.amazon.awssdk", module = "netty-nio-client")
    }
    api("software.amazon.awssdk:url-connection-client:2.55.12")
}
